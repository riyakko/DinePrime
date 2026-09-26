import { useEffect, useState } from 'react'

const fallbackImage = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80'

const emptyItem = { name: '', category_id: '', price: '', description: '', allergen_tags: '', image_url: '', stock_quantity: 0, is_available: true }

export default function MenuItemModal({ item, categories, onClose, onSave }) {
  const [form, setForm] = useState(emptyItem)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(item ? { ...emptyItem, ...item, category_id: item.category_id || categories[0]?.id || '' } : { ...emptyItem, category_id: categories[0]?.id || '' })
    setError('')
  }, [item, categories])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const preview = form.image_url || fallbackImage
  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.category_id || form.price === '' || Number(form.price) < 0) {
      setError('Name, category, and a valid non-negative price are required.')
      return
    }
    if (!Number.isInteger(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0) {
      setError('Stock quantity must be a whole number of zero or more.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, category_id: Number(form.category_id), price: Number(form.price), stock_quantity: Number(form.stock_quantity), is_available: Boolean(form.is_available) })
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'The menu item could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" role="presentation"><section className="staff-modal" role="dialog" aria-modal="true" aria-labelledby="menu-item-modal-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">STAFF MENU</p><h2 id="menu-item-modal-title">{item ? 'Edit item.' : 'Add an item.'}</h2><form className="staff-modal-form" onSubmit={submit}><label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} autoFocus /></label><label>Category<select value={form.category_id} onChange={(event) => update('category_id', event.target.value)}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="form-row"><label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} /></label><label>Stock quantity<input type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => update('stock_quantity', event.target.value)} /></label></div><label>Description<textarea rows="3" value={form.description} onChange={(event) => update('description', event.target.value)} /></label><label>Allergen tags<input value={form.allergen_tags} onChange={(event) => update('allergen_tags', event.target.value)} placeholder="Dairy, gluten, nuts" /></label><label>Image URL<input value={form.image_url} onChange={(event) => update('image_url', event.target.value)} placeholder="https://..." /></label><div className="modal-image-preview"><img src={preview} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackImage }} alt="Preview" /><span>Live preview</span></div><label className="toggle-row"><input type="checkbox" checked={Boolean(form.is_available)} onChange={(event) => update('is_available', event.target.checked)} /><span>Live for customers</span></label>{error && <p className="auth-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? 'Saving...' : item ? 'Update item' : 'Create item'} <span>→</span></button></div></form></section></div>
}

export function ConfirmModal({ item, onClose, onConfirm, busy = false }) {
  return <div className="modal-backdrop" role="presentation"><section className="staff-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">REMOVE MENU ITEM</p><h2 id="confirm-delete-title">Delete {item.name}?</h2><p className="muted">This removes the item from the catalog. Items referenced by existing orders cannot be deleted.</p><div className="modal-actions"><button className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting...' : 'Delete item'}</button></div></section></div>
}
