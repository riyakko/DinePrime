import { useEffect, useState, useRef } from 'react'
import { getKitchenOrders, updateOrderStatus } from '../../api'

const nextStatus = { Pending: 'Preparing', Preparing: 'Ready' }

const elapsedMinutes = (createdAt) => 
  Math.max(0, Math.floor((Date.now() - new Date(createdAt.replace(' ', 'T') + 'Z').getTime()) / 60000))

const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.error('Audio alert failed:', error)
  }
}

export default function KitchenDisplay({ onError }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const previousOrderIds = useRef(new Set())
  
  const load = () => 
    getKitchenOrders()
      .then((data) => {
        const newOrders = data.orders || []
        const newOrderIds = new Set(newOrders.map(o => o.id))
        
        // Play sound when new ticket arrives
        newOrderIds.forEach(id => {
          if (!previousOrderIds.current.has(id)) {
            playAlertSound()
          }
        })
        
        previousOrderIds.current = newOrderIds
        setOrders(newOrders)
      })
      .catch((error) => onError(error.response?.data?.error || 'Kitchen orders could not be loaded.'))
      .finally(() => setLoading(false))
  
  useEffect(() => { 
    load()
    const poll = window.setInterval(load, 8000) 
    return () => window.clearInterval(poll) 
  }, [])

  const advance = (order) => 
    updateOrderStatus(order.id, nextStatus[order.status])
      .then(load)
      .catch((error) => onError(error.response?.data?.error || 'Order status could not be updated.'))

  const sortedOrders = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return (
    <section className="kds-page content-width">
      <div className="kds-heading">
        <div>
          <p className="eyebrow">DINE PRIME · KITCHEN DISPLAY</p>
          <h1>Service<br /><em>now.</em></h1>
        </div>
        <span className="kds-live">● LIVE · 8 SEC REFRESH</span>
      </div>

      {loading ? (
        <p className="inline-state">Loading kitchen queue...</p>
      ) : orders.length === 0 ? (
        <p className="inline-state">No pending kitchen tickets.</p>
      ) : (
        <div className="kds-grid">
          {sortedOrders.map((order) => { 
            const minutes = elapsedMinutes(order.created_at)
            const targetPrep = order.estimated_prep_minutes || 15

            // Status indicator based on category target prep time
            let tone = 'fresh'
            if (minutes >= targetPrep) {
              tone = 'late' // Exceeded target prep time
            } else if (minutes >= Math.floor(targetPrep * 0.7)) {
              tone = 'waiting' // Nearing target prep time (>70%)
            }

            return (
              <article className={`kds-ticket ${tone}`} key={order.id}>
                <header>
                  <div>
                    <b>Order #{order.id}</b>
                    <span>{order.customer_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{minutes} / {targetPrep}m</strong>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Target</div>
                  </div>
                </header>

                <div className="kds-items">
                  {order.items?.map((item) => (
                    <div key={item.menu_item_id || item.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b>{item.quantity} × {item.name}</b>
                        {item.prep_time_minutes && (
                          <span style={{ fontSize: '0.75rem', opacity: 0.75, marginLeft: '0.5rem' }}>
                            ({item.prep_time_minutes}m)
                          </span>
                        )}
                      </div>
                      {item.special_instructions && (
                        <small>Note: {item.special_instructions}</small>
                      )}
                    </div>
                  ))}
                </div>

                <footer>
                  <span className={`kds-status ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                  <button className="button button-dark" onClick={() => advance(order)}>
                    Mark {nextStatus[order.status]} →
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}