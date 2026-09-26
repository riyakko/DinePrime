import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { checkTableAvailability, createMenuItem, deleteMenuItem, getCategories, getCustomerOrders, getMenuItems, getReservations, getStaffReservations, placeOrder as submitOrder, submitReservation, updateMenuItem, updateOrderStatus, updateReservationStatus } from './api'
import useAuth from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import MenuItemModal, { ConfirmModal } from './components/staff/MenuItemModal'
import KitchenDisplay from './components/staff/KitchenDisplay'
import Analytics from './components/staff/Analytics'

const customerNavItems = ['Home', 'Menu', 'Order', 'Reservations']
const staffNavItems = ['Dashboard', 'Orders', 'Kitchen Display', 'Analytics', 'Reservation management', 'Menu management', 'Inventory']
const staffRoutes = new Set(['Dashboard', 'Orders', 'Kitchen Display', 'Analytics', 'Reservation management', 'Menu management', 'Inventory'])

const routeSlugs = {
  Home: 'home', Menu: 'menu', Order: 'order', Reservations: 'reservations', Account: 'account',
  Dashboard: 'staff-dashboard', Orders: 'staff-orders', 'Kitchen Display': 'staff-kds', Analytics: 'staff-analytics', 'Reservation management': 'staff-reservations', 'Menu management': 'staff-menu', Inventory: 'staff-inventory',
}

const routeFromHash = () => Object.keys(routeSlugs).find((route) => routeSlugs[route] === window.location.hash.slice(1)) || 'Home'
const fallbackImage = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80'
const CART_STORAGE_KEY = 'dineprime_cart'
const LEGACY_CART_KEYS = ['dinePrimeCart', 'cart']
const handleImageError = (event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackImage }
const normalizeMenuItem = (item) => ({ ...item, available: Boolean(Number(item.is_available)), stockQuantity: Number(item.stock_quantity), image: item.image_url })
const errorMessage = (error, fallback) => error.response?.data?.error || (error.request ? 'The service is unavailable. Check your connection and try again.' : fallback)
const readStoredCart = () => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (saved) return JSON.parse(saved) || []
    for (const key of LEGACY_CART_KEYS) {
      const legacy = localStorage.getItem(key)
      if (!legacy) continue
      localStorage.setItem(CART_STORAGE_KEY, legacy)
      localStorage.removeItem(key)
      return JSON.parse(legacy) || []
    }
  } catch {
    return []
  }
  return []
}
const persistCart = (items) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cartUpdated'))
}

function App() {
  const { user, role, loading: authLoading, isStaff, login, register, logout, updateProfile } = useAuth()
  const [view, setView] = useState(routeFromHash)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [customerOrders, setCustomerOrders] = useState([])
  const [staffReservations, setStaffReservations] = useState([])
  const [customerReservations, setCustomerReservations] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [actionError, setActionError] = useState('')
  const [menuFilter, setMenuFilter] = useState('All items')
  const [menuSearch, setMenuSearch] = useState('')
  const [cart, setCart] = useState(() => readStoredCart())
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('Sign in')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Customer Data Handlers
  const fetchCustomerOrders = useCallback(() => {
    if (user && role === 'customer') {
      getCustomerOrders()
        .then((data) => setCustomerOrders(data.orders || []))
        .catch((error) => setActionError(errorMessage(error, 'Your order history could not be loaded.')))
    }
  }, [role, user])

  const fetchCustomerReservations = useCallback(() => {
    if (user && role === 'customer') {
      getReservations()
        .then((data) => setCustomerReservations(data.reservations || []))
        .catch((error) => setActionError(errorMessage(error, 'Your reservations could not be loaded.')))
    }
  }, [role, user])

  const refreshCustomerData = useCallback(() => {
    fetchCustomerOrders()
    fetchCustomerReservations()
  }, [fetchCustomerOrders, fetchCustomerReservations])

  useEffect(() => {
    getMenuItems({ search: menuSearch }).then((data) => { setMenuItems((data.items || []).map(normalizeMenuItem)); setMenuError('') }).catch((error) => { setMenuItems([]); setMenuError(errorMessage(error, 'The menu could not be loaded.')) }).finally(() => setMenuLoading(false))
  }, [menuSearch])

  useEffect(() => {
    if (isStaff) getCustomerOrders().then((data) => setOrders(data.orders || [])).catch((error) => setActionError(errorMessage(error, 'Orders could not be loaded.')))
  }, [isStaff])

  useEffect(() => {
    if (isStaff) getCategories().then((data) => setCategories(data.categories || [])).catch((error) => setActionError(errorMessage(error, 'Categories could not be loaded.')))
  }, [isStaff])

  useEffect(() => {
    if (isStaff) getStaffReservations().then((data) => setStaffReservations(data.reservations || [])).catch((error) => setActionError(errorMessage(error, 'Reservations could not be loaded.')))
  }, [isStaff])

  // Polling Effect for Customer Data (every 5 seconds)
  useEffect(() => {
    if (user && role === 'customer') {
      refreshCustomerData()
      const interval = setInterval(() => {
        refreshCustomerData()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user, role, refreshCustomerData])

  const refreshMenu = () => getMenuItems().then((data) => setMenuItems((data.items || []).map(normalizeMenuItem))).catch((error) => setActionError(errorMessage(error, 'The menu could not be refreshed.')))
  const refreshOrders = () => getCustomerOrders().then((data) => setOrders(data.orders || [])).catch((error) => setActionError(errorMessage(error, 'Orders could not be refreshed.')))
  const refreshReservations = () => getStaffReservations().then((data) => setStaffReservations(data.reservations || [])).catch((error) => setActionError(errorMessage(error, 'Reservations could not be refreshed.')))

  useEffect(() => {
    const handleHashChange = () => {
      const requestedRoute = routeFromHash()
      if (staffRoutes.has(requestedRoute) && !isStaff) {
        window.location.hash = routeSlugs.Home
        setView('Home')
        setAuthOpen(true)
        return
      }
      setView(requestedRoute)
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isStaff])

const addToCart = (item) => {
    if (!item.available || item.stockQuantity < 1) { 
      setActionError(`${item.name} is currently out of stock.`) 
      return 
    }

    setCart((items) => {
      const hasItem = items.some((entry) => entry.id === item.id)
      const currentQuantity = items.find((entry) => entry.id === item.id)?.quantity || 0

      if (currentQuantity >= item.stockQuantity) { 
        setActionError(`Only ${item.stockQuantity} ${item.name} available.`) 
        return items 
      }

      const next = hasItem
        ? items.map((entry) => entry.id === item.id ? { ...entry, quantity: Math.min(entry.quantity + 1, item.stockQuantity) } : entry)
        : [...items, { ...item, quantity: 1, special_instructions: item.special_instructions || '' }]

      persistCart(next)
      return next
    })

    // Clear previous errors and optionally show success feedback on page
    setActionError(null)
    if (typeof setActionNotice === 'function') {
      setActionNotice(`${item.name} added to your order!`)
    }
  }

  const updateQuantity = (id, delta) => {
    setCart((items) => {
      const next = items.map((item) => {
        if (item.id !== id) return item
        const nextQuantity = item.quantity + delta
        if (nextQuantity > item.stockQuantity) { setActionError(`Only ${item.stockQuantity} ${item.name} available.`); return item }
        return { ...item, quantity: nextQuantity }
      }).filter((item) => item.quantity > 0)
      persistCart(next)
      return next
    })
  }

  const updateInstructions = (id, instructions) => setCart((items) => {
    const next = items.map((item) => item.id === id ? { ...item, special_instructions: instructions } : item)
    persistCart(next)
    return next
  })

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
const placeOrder = async () => {
    if (isSubmitting) return
    if (!cart.length) { setOrderMessage('Your cart is empty.'); return }
    if (!user) { setAuthMode('Sign in'); setAuthOpen(true); return }

    setIsSubmitting(true)
    const diningOption = (localStorage.getItem('dinePrimeDiningOption') || 'takeout').toLowerCase()

    try {
      const tableNumber = localStorage.getItem('dinePrimeTable')
      const orderType = diningOption === 'dine-in' ? 'Reservation' : 'Takeout'

      // Construct the exact object expected by PHP
      const payload = {
        items: cart.map(item => ({
          menu_item_id: parseInt(item.menu_item_id || item.id, 10),
          quantity: parseInt(item.quantity, 10),
          special_instructions: item.special_instructions || ''
        })),
        order_type: orderType,
        table_id: diningOption === 'dine-in' && tableNumber ? parseInt(tableNumber, 10) : null,
        notes: ''
      }

      // Ensure submitOrder passes `payload` directly without wrapping it again
      const data = await submitOrder(payload)

      setOrderMessage(`Order ${data.order.id} received.`)
      setCart([])
      persistCart([])
      localStorage.removeItem('dinePrimeTable')
    } catch (error) {
      const backendMessage = error.response?.data?.error || error.response?.data?.message
      setOrderMessage(backendMessage || errorMessage(error, 'This order could not be placed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const navigate = (nextView) => {
    if (staffRoutes.has(nextView) && !isStaff) {
      setAuthOpen(true)
      return
    }
    setView(nextView)
    window.location.hash = routeSlugs[nextView]
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try { await logout(); navigate('Home'); setAuthMode('Sign in'); setAuthOpen(true) } catch (error) { setActionError(errorMessage(error, 'Logout failed. Please try again.')) }
  }

  const submitAuth = async () => {
    setAuthBusy(true)
    setAuthError('')
    try {
      const authenticatedUser = authMode === 'Register' ? await register(authForm) : await login(authForm)
      setAuthBusy(false)
      setAuthOpen(false)
      const nextView = ['staff', 'admin'].includes(authenticatedUser.role) ? 'Dashboard' : 'Account'
      setView(nextView)
      window.location.hash = routeSlugs[nextView]
    } catch (error) {
      setAuthBusy(false)
      setAuthError(errorMessage(error, 'Authentication failed.'))
      return
    }
  }

  return (
    <div className="site-shell">
      {authLoading ? <div className="loading-state">Preparing your table...</div> : null}
      <header className={`site-header ${isStaff ? 'staff-header' : ''}`}>
        <button className="brand" onClick={() => navigate(isStaff ? 'Dashboard' : 'Home')} aria-label="Dine Prime home">
          <span className="brand-mark">D</span>
          <span><strong>DINE PRIME</strong><small>EST. 2024</small></span>
        </button>
        <nav className="main-nav" aria-label={role === 'staff' ? 'Staff navigation' : 'Customer navigation'}>
          {(isStaff ? staffNavItems : customerNavItems).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}>{item}</button>)}
        </nav>
        <div className="header-actions">
          {isStaff ? <button className="account-link" onClick={handleLogout}>Log out <span aria-hidden="true">↗</span></button> : <button className="account-link" onClick={() => user ? navigate('Account') : (setAuthMode('Sign in'), setAuthOpen(true))}>{user ? `Account · ${(user.name || '').split(/\s+/)[0]}` : 'Sign In'} <span aria-hidden="true">↗</span></button>}
          {isStaff ? <span className="staff-badge">{role.toUpperCase()} VIEW</span> : <button className="cart-button" onClick={() => navigate('Order')} aria-label={`Order, ${cart.length} items`}><span>Order</span><b>{cart.reduce((sum, item) => sum + item.quantity, 0).toString().padStart(2, '0')}</b></button>}
        </div>
      </header>

      <main>
              {(menuError || actionError) && <div className="global-error" role="alert">{menuError || actionError}<button onClick={() => { setMenuError(''); setActionError('') }} aria-label="Dismiss error">×</button></div>}
              {isStaff && view === 'Kitchen Display' ? <ProtectedRoute roles={['staff', 'admin']}><KitchenDisplay onError={setActionError} /></ProtectedRoute> : null}
              {isStaff && view === 'Analytics' ? <ProtectedRoute roles={['staff', 'admin']}><Analytics onError={setActionError} /></ProtectedRoute> : null}
              {isStaff && staffRoutes.has(view) && !['Kitchen Display', 'Analytics'].includes(view) ? <ProtectedRoute roles={['staff', 'admin']}><StaffDashboard view={view} navigate={navigate} menuItems={menuItems} categories={categories} orders={orders} reservations={staffReservations} onMenuChange={refreshMenu} onStatusChange={refreshOrders} onReservationChange={refreshReservations} onError={setActionError} /></ProtectedRoute> : null}
              {role === 'customer' && view === 'Home' && <Home goTo={navigate} />}
              {role === 'customer' && view === 'Menu' && <Menu items={menuItems} loading={menuLoading} error={menuError} filter={menuFilter} setFilter={setMenuFilter} search={menuSearch} setSearch={setMenuSearch} addToCart={addToCart} />}
              {role === 'customer' && view === 'Order' && <Order cart={cart} total={total} updateQuantity={updateQuantity} updateInstructions={updateInstructions} goTo={navigate} orderMessage={orderMessage} placeOrder={placeOrder} isSubmitting={isSubmitting} />}
              {role === 'customer' && view === 'Reservations' && <LiveReservations user={user} menuItems={menuItems} goTo={navigate} onError={setActionError} onReservationCreated={fetchCustomerReservations} />}
              {role === 'customer' && view === 'Account' && (
                <Account
                  user={user}
                  reservations={customerReservations}
                  orders={customerOrders}
                  onClose={() => navigate('Home')}
                  onLogout={handleLogout}
                  onRefresh={refreshCustomerData}
                  onSave={async (details) => {
                    try {
                      await updateProfile(details)
                    } catch (error) {
                      setActionError(errorMessage(error, 'Profile changes could not be saved.'))
                      throw error
                    }
                  }}
                />
              )}
      </main>

      <footer className="site-footer"><span>© 2026 Dine Prime</span><span>{isStaff ? 'Internal operations' : 'National University Dining'}</span><span>{isStaff ? 'Staff support' : 'Instagram &nbsp; Contact'}</span></footer>

      {authOpen && <div className="modal-backdrop"><section className="auth-modal">
        <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button>
        <p className="eyebrow">DINE PRIME MEMBERS</p><h2>{authMode === 'Sign in' ? 'Welcome back.' : 'Join the table.'}</h2>
        <p className="muted">{authMode === 'Sign in' ? 'Access your reservations and saved preferences.' : 'Create an account for a more considered visit.'}</p>
        {authMode === 'Register' && <label>Your name<input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Jordan Lee" /></label>}
        <label>Email address<input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label><label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="••••••••" /></label>
        {authError && <p className="auth-error">{authError}</p>}
        <button className="button button-dark full-width" onClick={submitAuth} disabled={authBusy}>{authBusy ? 'Working...' : authMode}</button>
        <button className="text-button" onClick={() => setAuthMode(authMode === 'Sign in' ? 'Register' : 'Sign in')}>{authMode === 'Sign in' ? 'Need an account? Register' : 'Already a member? Sign in'}</button>
        <p className="auth-note">Staff and admin accounts are redirected to the operations interface after authentication.</p>
      </section></div>}
    </div>
  )
}

function Home({ goTo }) {
  return <>
    <section className="hero page-pad"><img className="hero-image" src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80" onError={handleImageError} alt="A plated seasonal dish" /><div className="hero-copy"><p className="eyebrow light">A STUDY IN SEASONAL DINING</p><h1>Make an<br />evening <em>of it.</em></h1><p>An intimate dining house where<br />ingredient, fire, and time come<br />together.</p><div className="hero-actions"><button className="button button-cream" onClick={() => goTo('Reservations')}>Reserve a table <span>→</span></button><button className="link-button light-link" onClick={() => goTo('Menu')}>Explore the menu <span>↗</span></button></div></div><div className="hero-note">OPEN WED - SAT &nbsp; 5:30 - 10:00 PM</div></section>
    <section className="intro page-pad"><div><p className="eyebrow">THE DINE PRIME EXPERIENCE</p><h2>Thoughtful food.<br /><em>Unhurried moments.</em></h2><p className="body-copy">Our menu follows the rhythm of the<br />seasons, drawing from local farms and<br />old-world technique. Every plate is an<br />invitation to linger.</p></div><div className="feature-grid"><Feature image="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80" index="01 — THE KITCHEN" title="Where the magic begins" /><Feature image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80" index="02 — THE TABLE" title="Gather around" /></div></section>
    <section className="quote-band"><p>“The best meals are<br /><em>remembered</em> in company.”</p><span>— DINE PRIME JOURNAL</span></section>
  </>
}

function Feature({ image, index, title }) { return <article className="feature"><div className="feature-image"><img src={image} onError={handleImageError} alt={title} /></div><p className="eyebrow">{index}</p><h3>{title}</h3></article> }

function Menu({ items, loading, error, filter, setFilter, search, setSearch, addToCart }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const filters = ['All items', ...new Set(items.map((item) => item.category).filter(Boolean))]
  const counts = filters.reduce((result, category) => ({ ...result, [category]: category === 'All items' ? items.length : items.filter((item) => item.category === category).length }), {})
  const visibleItems = items.filter((item) => (filter === 'All items' || item.category === filter) && `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()))
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tableParam = urlParams.get('table')
    if (tableParam) {
      localStorage.setItem('dinePrimeTable', tableParam)
    }
  }, [])
  return <section className="menu-page content-width"><div className="section-heading"><p className="eyebrow">THE DINE PRIME MENU</p><h1>Eat <em>well.</em></h1><p className="muted">Seasonal plates, considered drinks, and a few<br />things we could not resist.</p></div><div className="menu-toolbar"><label className="menu-search" aria-label="Search the menu">⌕ <input aria-label="Search the menu" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the menu" /></label><div>{filters.map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="menu-layout"><aside><p className="eyebrow">BROWSE</p>{filters.map((item) => <button key={item} className={filter === item ? 'side-selected' : ''} onClick={() => setFilter(item)}>{item}<span>{String(counts[item]).padStart(2, '0')}</span></button>)}<p className="aside-note"><b>INFORMATION</b><br />Categories help keep discovery<br />lightweight on mobile.</p></aside><div className="menu-grid">{loading ? <p className="inline-state">Loading the menu...</p> : error ? <p className="inline-error" role="alert">{error}</p> : visibleItems.length ? visibleItems.map((item) => <MenuCard key={item.id} item={item} addToCart={addToCart} onSelect={setSelectedItem} />) : <p className="inline-state">No dishes match your search.</p>}</div></div>{selectedItem && <ProductDetail item={selectedItem} addToCart={addToCart} onClose={() => setSelectedItem(null)} />}</section>
}

function MenuCard({ item, addToCart, onSelect }) { return <article className={`menu-card ${!item.available || item.stockQuantity < 1 ? 'unavailable' : ''}`}><button className={`dish-image ${item.tone}`} onClick={() => onSelect(item)}><img src={item.image} onError={handleImageError} alt={item.name} /><span>{item.available && item.stockQuantity > 0 ? 'VIEW DETAILS' : 'UNAVAILABLE'}</span></button><div className="card-meta"><div><p className="eyebrow">{item.category}</p><h3>{item.name}</h3><p>{item.description}</p>{item.allergen_tags && <small className="stock-label">Contains: {item.allergen_tags}</small>}<small className="stock-label">{item.available && item.stockQuantity > 0 ? `${item.stockQuantity} available` : 'Currently unavailable'}</small></div><span className="price">${item.price}</span></div>{item.available && item.stockQuantity > 0 && <button className="add-link" onClick={() => addToCart(item)}>Add to order <span>+</span></button>}</article> }
function ProductDetail({ item, addToCart, onClose }) { const [instructions, setInstructions] = useState(''); return <div className="modal-backdrop"><section className="product-modal"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><img src={item.image_url} onError={handleImageError} alt={item.name} /><p className="eyebrow">{item.category}</p><h2>{item.name}</h2><p className="muted">{item.description}</p>{item.allergen_tags && <p className="stock-label">Contains: {item.allergen_tags}</p>}<label className="special-request">Special instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Allergies, preferences, or a note for the kitchen..." /></label><div className="product-footer"><strong>${item.price}</strong><button className="button button-dark" disabled={!item.is_available || item.stock_quantity < 1} onClick={() => { addToCart({ ...item, available: item.is_available, stockQuantity: item.stock_quantity, special_instructions: instructions }); onClose() }}>{item.is_available && item.stock_quantity > 0 ? 'Add to order →' : 'Unavailable'}</button></div></section></div> }

function Order({ cart, total, updateQuantity, updateInstructions, goTo, orderMessage, placeOrder, isSubmitting }) { 
  const [diningOption, setDiningOption] = useState('takeout')
  const [cartItems, setCartItems] = useState(cart)
  const [errorMessage, setErrorMessage] = useState('')
  const tableNumber = localStorage.getItem('dinePrimeTable')
  
  const isValidTableNumber = (table) => {
    if (!table) return false
    const numericValue = parseInt(table.replace(/\D/g, ''))
    return !isNaN(numericValue) && numericValue > 0 && numericValue <= 99
  }
  
  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem('dineprime_cart')
        const parsed = saved ? JSON.parse(saved) : []
        setCartItems(Array.isArray(parsed) && parsed.length ? parsed : (cart.length ? cart : parsed))
      } catch {
        setCartItems(cart.length ? cart : [])
      }
    }

    syncCart()
    window.addEventListener('cartUpdated', syncCart)
    window.addEventListener('storage', syncCart)

    return () => {
      window.removeEventListener('cartUpdated', syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [])

  useEffect(() => {
    setCartItems(cart)
  }, [cart])
  
  useEffect(() => {
    if (tableNumber) {
      setDiningOption('dine-in')
    }
  }, [tableNumber])
  
  useEffect(() => {
    localStorage.setItem('dinePrimeDiningOption', diningOption)
  }, [diningOption])
  
  useEffect(() => {
    if (orderMessage) {
      setErrorMessage(orderMessage)
    }
  }, [orderMessage])
  
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = cartTotal * 0.10
  const finalTotal = cartTotal + tax
  
return (
    <section className="order-page content-width">
      <div className="section-heading">
        <p className="eyebrow">YOUR ORDER · STEP 02 OF 03</p>
        <h1>Build your<br /><em>evening.</em></h1>
        <p className="muted">Choose a time, make it yours, and we will take<br />care of the rest.</p>
      </div>

      <div className="order-layout">
        <div className="order-items">
          {cartItems.length === 0 ? (
            <>
              <label className="dining-option">
                Dining preference
                <div className="segmented">
                  {['dine-in', 'takeout'].map((option) => (
                    <button
                      key={option}
                      className={diningOption === option ? 'chosen' : ''}
                      onClick={() => {
                        setDiningOption(option);
                        if (option === 'takeout') localStorage.removeItem('dinePrimeTable');
                      }}
                    >
                      {option === 'dine-in' ? 'Dine-In' : 'Takeout'}
                      {option === 'dine-in' && isValidTableNumber(tableNumber) && (
                        <small>Table {tableNumber}</small>
                      )}
                    </button>
                  ))}
                </div>
              </label>

              <div className="empty-state">
                <p className="eyebrow">
                  {diningOption === 'dine-in' ? 'YOUR TABLE AWAITS' : 'READY FOR PICKUP'}
                </p>
                <h2>
                  {diningOption === 'dine-in' ? (
                    isValidTableNumber(tableNumber) ? (
                      <>Table {tableNumber} <em>reserved.</em></>
                    ) : (
                      <>Nothing here <em>yet.</em></>
                    )
                  ) : (
                    <>Nothing here <em>yet.</em></>
                  )}
                </h2>

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <p>
                  {diningOption === 'dine-in'
                    ? 'Start with something from the menu.'
                    : 'Browse our menu for pickup.'}
                </p>
                <button className="button button-dark" onClick={() => goTo('Menu')}>
                  Browse menu <span>→</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="dining-option">
                Dining preference
                <div className="segmented">
                  {['dine-in', 'takeout'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={diningOption === option ? 'chosen' : ''}
                      onClick={() => {
                        setDiningOption(option);
                        
                        // 1. Always persist the selected option to localStorage
                        localStorage.setItem('dinePrimeDiningOption', option);

                        // 2. Clear error message on tab switch
                        if (typeof setErrorMessage === 'function') setErrorMessage('');
                        if (typeof setOrderMessage === 'function') setOrderMessage('');

                        // 3. Clear table preference if takeout is selected
                        if (option === 'takeout') {
                          localStorage.removeItem('dinePrimeTable');
                        }
                      }}
                    >
                      {option === 'dine-in' ? 'Dine-In' : 'Takeout'}
                      {option === 'dine-in' && isValidTableNumber(tableNumber) && (
                        <small>Table {tableNumber}</small>
                      )}
                    </button>
                  ))}
                </div>
              </label>

              {errorMessage && <p className="error-message">{errorMessage}</p>}

              {cartItems.map((item) => (
                <article className="order-item" key={item.id}>
                  <img
                    className="order-thumb"
                    src={item.image_url}
                    onError={handleImageError}
                    alt=""
                  />
                  <div>
                    <p className="eyebrow">{item.category}</p>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <textarea
                      className="item-instructions"
                      value={item.special_instructions || ''}
                      onChange={(event) => updateInstructions(item.id, event.target.value)}
                      placeholder="Special instructions for this item..."
                    />
                  </div>
                  <div className="quantity">
                    <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button
                      disabled={item.quantity >= item.stockQuantity}
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                </article>
              ))}

              <button
                className="button button-dark"
                onClick={placeOrder}
                disabled={cartItems.length === 0 || isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Place order'} <span>→</span>
              </button>
            </>
          )}
        </div>

        <aside className="summary">
          <p className="eyebrow">
            YOUR ORDER <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items</span>
          </p>
          {cartItems.map((item) => (
            <div className="summary-row" key={item.id}>
              <span>{item.quantity} × {item.name}</span>
              <b>${(item.price * item.quantity).toFixed(2)}</b>
            </div>
          ))}
          <hr />
          <div className="summary-total">
            <span>Subtotal</span>
            <b>${cartTotal.toFixed(2)}</b>
          </div>
          <div className="summary-total">
            <span>Tax (10%)</span>
            <b>${tax.toFixed(2)}</b>
          </div>
          <div className="summary-total grand-total">
            <span>Total</span>
            <b>${finalTotal.toFixed(2)}</b>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LiveReservations({ user, menuItems, goTo, onError }) {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [addOns, setAddOns] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const today = new Date()
  const tomorrowDate = new Date(today)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().split('T')[0]

  const [date, setDate] = useState(tomorrow)
  const [time, setTime] = useState('18:00')
  const [partySize, setPartySize] = useState(2)

useEffect(() => { 
    setLoading(true) 
    checkTableAvailability(date, time, partySize)
      .then((data) => { 
        // Normalize table labels so every item consistently uses "Table XX"
        const formattedTables = (data.tables || []).map((t) => {
          const rawNum = String(t.table_number || t.number || t.id).replace(/\D/g, '')
          const formattedNumber = rawNum ? `Table ${rawNum.padStart(2, '0')}` : t.table_number
          return {
            ...t,
            table_number: formattedNumber
          }
        })

        setTables(formattedTables) 

        const urlParams = new URLSearchParams(window.location.search)
        const tableNumber = urlParams.get('table_number')
        if (tableNumber) {
          const matchedTable = formattedTables.find(t => 
            t.table_number === tableNumber || 
            t.table_number.endsWith(tableNumber.padStart(2, '0'))
          )
          if (matchedTable && matchedTable.status === 'Available') {
            setSelectedTable(matchedTable)
          }
        }
      })
      .catch((error) => {
        if (typeof onError === 'function') onError('Could not fetch table availability.')
      })
      .finally(() => setLoading(false))
  }, [date, time, partySize])
  const toggleAddOn = (item) => setAddOns((current) => current.some((entry) => entry.menu_item_id === item.id) ? current.filter((entry) => entry.menu_item_id !== item.id) : [...current, { menu_item_id: item.id, quantity: 1, name: item.name, price: Number(item.price) }])
  const addonTotal = addOns.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const reserve = async () => { if (!user) { onError('Please sign in before making a reservation.'); return } if (!selectedTable) { setMessage('Choose an available table before continuing.'); return } setSubmitting(true); try { await submitReservation({ reservation_date: date, reservation_time: time, party_size: partySize, table_id: selectedTable.id, add_ons: addOns.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })) }); setMessage('Reservation request submitted. Staff will confirm your table shortly.'); setSelectedTable(null) } catch (error) { setMessage(errorMessage(error, 'The reservation could not be created. The table may have just been booked.')) } finally { setSubmitting(false) } }
  const timeSlots = [['17:00', '5:00 PM'], ['17:30', '5:30 PM'], ['18:00', '6:00 PM'], ['18:30', '6:30 PM'], ['19:00', '7:00 PM'], ['19:30', '7:30 PM'], ['20:00', '8:00 PM'], ['20:30', '8:30 PM'], ['21:00', '9:00 PM'], ['21:30', '9:30 PM']]
  return <section className="reservation-page content-width"><div className="section-heading"><p className="eyebrow">A SEAT AT THE TABLE</p><h1>Reserve a<br /><em>moment.</em></h1><p className="muted">Choose your date, time, table, and any dishes<br />you would like waiting when you arrive.</p></div><div className="reservation-layout"><div className="reservation-form"><div className="form-row"><label>Date<input type="date" min={tomorrow} value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)}>{timeSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label>Party size<div className="segmented">{[2, 3, 4, 5].map((size) => <button key={size} className={partySize === size ? 'chosen' : ''} onClick={() => setPartySize(size)}>{size === 5 ? '5+' : `${size} guests`}</button>)}</div></label><p className="eyebrow table-label">AVAILABLE TABLES <span>{loading ? 'CHECKING...' : 'SELECT ONE'}</span></p><div className="table-map live-table-map">{tables.map((table) => <button key={table.id} disabled={table.status !== 'Available' || !table.eligible} className={`table ${table.capacity === 2 ? 'round' : 'square'} ${selectedTable?.id === table.id ? 'chosen' : ''} ${table.status === 'Reserved' || !table.eligible ? 'occupied' : ''}`} onClick={() => setSelectedTable(table)}>{table.table_number}<small>{table.capacity} seats</small><small>{table.status === 'Reserved' ? 'Reserved' : !table.eligible ? 'Too small' : table.location_description}</small></button>)}</div><div className="legend"><span>Available</span><span>Selected</span><span>Reserved</span></div><div className="optional"><p className="eyebrow">OPTIONAL ADD-ON</p><b>Pre-order for the table</b><small>Choose something to have waiting when you arrive.</small><div className="addon-list">{menuItems.filter((item) => item.available && item.stockQuantity > 0).slice(0, 4).map((item) => <label key={item.id}><input type="checkbox" checked={addOns.some((entry) => entry.menu_item_id === item.id)} onChange={() => toggleAddOn(item)} />{item.name}<span>${item.price}</span></label>)}</div></div>{message && <p className="inline-error" role="alert">{message}</p>}</div><aside className="reservation-summary"><p className="eyebrow">YOUR RESERVATION</p><h2>{date}</h2><hr /><div><span>Time</span><b>{timeSlots.find(([value]) => value === time)?.[1] || time}</b></div><div><span>Party</span><b>{partySize} guests</b></div><div><span>Table</span><b>{selectedTable ? `${selectedTable.table_number} · ${selectedTable.location_description}` : 'Select a table'}</b></div><div><span>Add-ons</span><b>${addonTotal.toFixed(2)}</b></div>{addOns.map((item) => <div className="summary-row" key={item.menu_item_id}><span>{item.name}</span><b>${item.price}</b></div>)}<button className="button button-dark full-width" disabled={submitting} onClick={reserve}>{submitting ? 'Submitting...' : 'Reserve table →'}</button><button className="quiet-link" onClick={() => goTo('Home')}>← Return to dining</button></aside></div></section>
}

function StaffDashboard({ view, navigate, menuItems, categories, orders, reservations, onMenuChange, onStatusChange, onReservationChange, onError }) {
  const isMenu = view === 'Menu management'
  const isReservations = view === 'Reservation management'
  const isInventory = view === 'Inventory'
  return <section className="staff-page content-width"><div className="staff-heading"><div><p className="eyebrow">DINE PRIME · OPERATIONS</p><h1>{view === 'Dashboard' ? <>Good evening,<br /><em>team.</em></> : view}</h1><p className="muted">Thursday, October 24 · Service begins at 5:30 PM</p></div><button className="button button-dark" onClick={() => navigate(isMenu ? 'Menu management' : isReservations ? 'Reservation management' : 'Orders')}>{isMenu ? 'Add menu item +' : isReservations ? 'Refresh reservations →' : 'View all orders →'}</button></div>{view === 'Dashboard' && <><div className="staff-metrics"><Metric label="Today’s orders" value={orders.length} detail="From the live order queue" /><Metric label="Pending orders" value={orders.filter((order) => order.status === 'Pending').length} detail="Need confirmation" /><Metric label="Revenue" value={`$${orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0).toFixed(2)}`} detail="Loaded from MySQL" /><Metric label="Low stock" value={menuItems.filter((item) => item.stockQuantity < 5).length} detail="Review inventory" /></div><div className="staff-columns"><StaffOrderTable orders={orders.slice(0, 5)} navigate={navigate} onStatusChange={onStatusChange} onError={onError} /><StaffPanel title="Service pulse"><div className="pulse-row"><span>Kitchen</span><b>Live queue</b><i className="pulse-good" /></div><div className="pulse-row"><span>Front of house</span><b>{orders.length} orders</b><i className="pulse-warn" /></div><div className="pulse-row"><span>Inventory</span><b>{menuItems.length} menu items</b><i className="pulse-good" /></div></StaffPanel></div></>}{view === 'Orders' && <StaffOrderTable orders={orders} navigate={navigate} detailed onStatusChange={onStatusChange} onError={onError} />}{isReservations && <StaffReservations reservations={reservations} onStatusChange={onReservationChange} onError={onError} />}{isMenu && <MenuManagement items={menuItems} categories={categories} onMenuChange={onMenuChange} onError={onError} />}{isInventory && <InventoryManagement items={menuItems} />}</section>
}

function StaffReservations({ reservations, onStatusChange, onError }) { const statuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed']; const change = (id, status) => updateReservationStatus(id, status).then(onStatusChange).catch((error) => onError(errorMessage(error, 'Reservation status could not be updated.'))); return <StaffPanel title="Reservation confirmations"><div className="staff-table"><div className="staff-table-row table-header"><span>Guest</span><span>When</span><span>Table</span><span>Status</span></div>{reservations.length ? reservations.map((reservation) => <div className="staff-table-row" key={reservation.id}><span><b>{reservation.customer_name}</b><small>{reservation.customer_email}</small></span><span>{reservation.reservation_date}<small>{reservation.reservation_time} · {reservation.party_size} guests</small></span><span>{reservation.table_number}<small>{reservation.location_description}</small></span><select className="status" value={reservation.status} onChange={(event) => change(reservation.id, event.target.value)} aria-label={`Status for reservation ${reservation.id}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>{reservation.add_ons?.length ? <small className="reservation-addons">Add-ons: {reservation.add_ons.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</small> : null}</div>) : <p className="inline-state">No reservations found.</p>}</div></StaffPanel> }

function Metric({ label, value, detail }) { return <article className="staff-metric"><p className="eyebrow">{label}</p><strong>{value}</strong><span>{detail}</span></article> }
function StaffPanel({ title, children }) { return <section className="staff-panel"><div className="staff-panel-header"><p className="eyebrow">{title}</p><span className="plain-action" aria-hidden="true">···</span></div>{children}</section> }
function StaffOrderTable({ orders, navigate, detailed = false, onStatusChange, onError }) { const statuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled']; const changeStatus = (id, status) => updateOrderStatus(id, status).then(onStatusChange).catch((error) => onError(errorMessage(error, 'Order status could not be updated.'))); return <StaffPanel title={detailed ? 'All orders' : 'Live orders'}><div className="staff-table"><div className="staff-table-row table-header"><span>Order</span><span>Guest</span><span>Details</span><span>Status</span></div>{orders.length ? orders.map((order) => <div className="staff-table-row" key={order.id} onClick={() => navigate('Orders')}><span><b>#{order.id}</b><small>${Number(order.total_amount || 0).toFixed(2)}</small></span><span>{order.customer_name}<small>{order.customer_email}</small></span><span>{order.items?.length || 0} items</span><select className={`status status-${order.status.toLowerCase()}`} value={order.status} onClick={(event) => event.stopPropagation()} onChange={(event) => changeStatus(order.id, event.target.value)} aria-label={`Status for order ${order.id}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>) : <p className="inline-state">No orders found.</p>}</div></StaffPanel> }
function MenuManagement({ items, categories, onMenuChange, onError }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const filteredItems = items.filter((item) => (category === 'all' || String(item.category_id) === category) && `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()))
  const save = async (form) => { setBusy(true); try { if (editing) { await updateMenuItem(editing.id, form) } else { await createMenuItem(form) } await onMenuChange() } catch (error) { throw new Error(errorMessage(error, 'Menu item could not be saved.')) } finally { setBusy(false) } }
  const remove = async () => { setBusy(true); try { await deleteMenuItem(deleting.id); setDeleting(null); await onMenuChange() } catch (error) { onError(errorMessage(error, 'Menu item could not be deleted.')) } finally { setBusy(false) } }
  const toggleAvailability = (item) => updateMenuItem(item.id, { is_available: !item.available }).then(onMenuChange).catch((error) => onError(errorMessage(error, 'Availability could not be updated.')))
  const updateStock = (item, value) => { const stock = Number(value); if (!Number.isInteger(stock) || stock < 0) { onError('Stock quantity must be a whole number of zero or more.'); return } updateMenuItem(item.id, { stock_quantity: stock, is_available: stock > 0 && item.available }).then(onMenuChange).catch((error) => onError(errorMessage(error, 'Stock could not be updated.'))) }
  return <><StaffPanel title="Menu management"><div className="management-toolbar"><div className="management-filters"><input className="staff-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu..." aria-label="Search menu" /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="button button-dark" onClick={() => setEditing({})}>Add menu item <span>+</span></button></div>{filteredItems.length ? filteredItems.map((item) => <div className="management-row menu-management-row" key={item.id}><div className={`management-thumb ${item.tone}`} /><div><b>{item.name}</b><small>{item.category} · ${Number(item.price).toFixed(2)}</small></div><input className="stock-input" type="number" min="0" step="1" value={item.stockQuantity} onChange={(event) => updateStock(item, event.target.value)} aria-label={`${item.name} stock`} /><button className={`status ${item.available ? 'status-live' : 'status-sold'}`} onClick={() => toggleAvailability(item)}>{item.available ? 'Live' : 'Unavailable'}</button><button className="plain-action" onClick={() => setEditing(item)}>Edit</button><button className="plain-action danger" onClick={() => setDeleting(item)}>Delete</button></div>) : <p className="inline-state">No menu items match your filters.</p>}</StaffPanel>{editing && <MenuItemModal item={editing.id ? editing : null} categories={categories} onClose={() => setEditing(null)} onSave={save} />}{deleting && <ConfirmModal item={deleting} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove} />}</>
}

function InventoryManagement({ items }) { return <StaffPanel title="Inventory & stock"><div className="inventory-grid"><Metric label="In stock" value={`${items.filter((item) => item.stockQuantity > 0).length}/${items.length}`} detail="Menu items available" /><Metric label="To reorder" value={items.filter((item) => item.stockQuantity < 5).length} detail="Review today" /></div>{items.map((item) => <div className="inventory-row" key={item.id}><span>{item.name}</span><div className="stock-bar"><i style={{ width: `${Math.min(100, item.stockQuantity * 5)}%` }} /></div><span>{item.stockQuantity} units</span></div>)}</StaffPanel> }

function Account({ user, reservations = [], orders = [], onClose, onLogout, onSave, onRefresh }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' })
  const [preferences, setPreferences] = useState({ vegetarian: false, outdoor: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (typeof onRefresh === 'function') {
      onRefresh()
      const interval = setInterval(() => {
        onRefresh()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [onRefresh])

  const nameParts = (form.name || 'Guest Member').trim().split(/\s+/)
  const save = async () => { setSaving(true); try { await onSave?.(form) } finally { setSaving(false) } }

  const tabs = [
    { id: 'profile', label: 'Profile', badge: '→' },
    { id: 'reservations', label: 'Reservations', badge: String(reservations?.length || 0).padStart(2, '0') },
    { id: 'orders', label: 'Order history', badge: String(orders?.length || 0).padStart(2, '0') },
    { id: 'preferences', label: 'Preferences', badge: '→' },
  ]

  return (
    <section className="account-page content-width">
      <div className="section-heading">
        <p className="eyebrow">DINE PRIME MEMBERS</p>
        <h1>Your<br /><em>account.</em></h1>
        <p className="muted">Keep your details, preferences, and evenings<br />in one considered place.</p>
      </div>
      <div className="account-layout">
        <aside className="account-nav">
          {tabs.map((tab) => (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label} <span>{tab.badge}</span>
            </button>
          ))}
          <button onClick={onLogout}>Sign out <span>↗</span></button>
        </aside>
        <div className="account-panel">
          {activeTab === 'profile' && (
            <>
              <p className="eyebrow">PROFILE DETAILS</p>
              <h2>Hello, {nameParts[0]}.</h2>
              <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Email address<input value={user?.email || ''} readOnly /></label>
              <label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Add a phone number" /></label>
              <label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Add an address" /></label>
              <div className="panel-footer">
                <span>Changes are saved to your account</span>
                <button className="button button-dark" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </>
          )}
          {activeTab === 'reservations' && (
            <>
              <p className="eyebrow">YOUR RESERVATIONS</p>
              <h2>Table for {nameParts[0]}.</h2>
              {reservations?.length ? (
                <div className="account-reservations">
                  {reservations.map((reservation) => (
                    <article className="account-reservation" key={reservation.id}>
                      <div>
                        <b>{reservation.reservation_date}</b>
                        <span>{reservation.reservation_time} · {reservation.table_number}</span>
                        <small>{reservation.party_size} guests · {reservation.location_description}</small>
                      </div>
                      <strong className={`reservation-status status-${(reservation.status || 'pending').toLowerCase()}`}>
                        {reservation.status}
                      </strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">You do not have any reservations yet.</p>
              )}
            </>
          )}
          {activeTab === 'orders' && (
            <>
              <p className="eyebrow">ORDER HISTORY</p>
              <h2>Past evenings.</h2>
              {orders?.length ? (
                <div className="account-reservations">
                  {orders.map((order) => (
                    <article className="account-reservation" key={order.id}>
                      <div>
                        <b>Order #{order.id}</b>
                        <span>{new Date(order.created_at).toLocaleDateString()} · ${Number(order.total_amount).toFixed(2)}</span>
                        {order.items?.map((item) => (
                          <small key={item.menu_item_id || item.id}>
                            {item.quantity} × {item.name}{item.special_instructions ? ` · Note: ${item.special_instructions}` : ''}
                          </small>
                        ))}
                      </div>
                      <strong className={`reservation-status status-${(order.status || 'pending').toLowerCase()}`}>
                        {order.status}
                      </strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">You do not have any orders yet.</p>
              )}
            </>
          )}
          {activeTab === 'preferences' && (
            <>
              <p className="eyebrow">DINING PREFERENCES</p>
              <h2>Make it yours.</h2>
              <label className="preference-row">
                <input type="checkbox" checked={preferences.vegetarian} onChange={(event) => setPreferences({ ...preferences, vegetarian: event.target.checked })} /> Vegetarian selections
              </label>
              <label className="preference-row">
                <input type="checkbox" checked={preferences.outdoor} onChange={(event) => setPreferences({ ...preferences, outdoor: event.target.checked })} /> Outdoor seating when available
              </label>
              <p className="muted">Preferences are used to shape future visits.</p>
            </>
          )}
        </div>
      </div>
      <button className="quiet-link" onClick={onClose}>← Return to dining</button>
    </section>
  )
}

export default App
