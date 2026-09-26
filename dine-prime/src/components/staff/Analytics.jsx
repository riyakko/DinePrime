import { useEffect, useState } from 'react'
import { getAnalytics } from '../../api'

export default function Analytics({ onError }) {
  const [data, setData] = useState(null)
  useEffect(() => { getAnalytics().then(setData).catch((error) => onError(error.response?.data?.error || 'Analytics could not be loaded.')) }, [onError])
  if (!data) return <section className="analytics-page content-width"><p className="inline-state">Loading analytics...</p></section>
  const maxSales = Math.max(...data.top_items.map((item) => Number(item.quantity)), 1)
  return <section className="analytics-page content-width"><div className="staff-heading"><div><p className="eyebrow">DINE PRIME · REPORTING</p><h1>Service<br /><em>insight.</em></h1><p className="muted">Revenue, best sellers, and reservation demand.</p></div></div><div className="analytics-metrics"><article><p className="eyebrow">TODAY</p><strong>${data.revenue.today.toFixed(2)}</strong></article><article><p className="eyebrow">THIS WEEK</p><strong>${data.revenue.week.toFixed(2)}</strong></article><article><p className="eyebrow">THIS MONTH</p><strong>${data.revenue.month.toFixed(2)}</strong></article></div><div className="analytics-columns"><section className="staff-panel"><p className="eyebrow">TOP 5 MENU ITEMS</p>{data.top_items.map((item) => <div className="analytics-row" key={item.name}><span>{item.name}</span><b>{item.quantity} sold</b><div className="analytics-bar"><i style={{ width: `${(Number(item.quantity) / maxSales) * 100}%` }} /></div></div>)}</section><section className="staff-panel"><p className="eyebrow">RESERVATION DEMAND</p>{data.reservation_slots.length ? data.reservation_slots.map((slot) => <div className="analytics-row" key={slot.time_slot}><span>{slot.time_slot}</span><b>{slot.reservations} bookings · avg {slot.average_party_size}</b></div>) : <p className="inline-state">No reservation data yet.</p>}</section></div></section>
}
