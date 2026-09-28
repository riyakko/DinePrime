import React, { useState, useEffect } from 'react'

export default function EWalletQRModal({ paymentData, onClose, onPaymentSuccess }) {
  const [timeLeft, setTimeLeft] = useState(paymentData?.expires_in_seconds || 600)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const handleSimulatePaid = () => {
    setCheckingStatus(true)
    setTimeout(() => {
      setCheckingStatus(false)
      if (onPaymentSuccess) onPaymentSuccess(paymentData.order_id)
    }, 1200)
  }

  if (!paymentData) return null

  return (
    <div className="modal-backdrop">
      <div className="qr-payment-card">
        <div className="qr-header">
          <h3>Pay with {paymentData.provider || 'E-Wallet'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="qr-body">
          <p className="amount-tag">
            Amount Due: <strong>${Number(paymentData.amount).toFixed(2)}</strong>
          </p>

          <div className="qr-frame">
            {timeLeft > 0 ? (
              <img 
                src={paymentData.qr_code_url} 
                alt="Payment QR Code" 
                className="qr-image"
              />
            ) : (
              <div className="qr-expired">
                <p>QR Code Expired</p>
                <button onClick={onClose} className="btn-secondary">Close & Retry</button>
              </div>
            )}
          </div>

          {timeLeft > 0 && (
            <p className="timer-notice">
              Code expires in: <span>{formatTime(timeLeft)}</span>
            </p>
          )}

          <ol className="instructions">
            <li>Open your <strong>{paymentData.provider || 'E-Wallet'}</strong> app.</li>
            <li>Select <strong>Scan QR</strong> and point camera at screen.</li>
            <li>Confirm the amount and complete payment.</li>
          </ol>
        </div>

        <div className="qr-footer">
          <button 
            className="btn-primary" 
            onClick={handleSimulatePaid} 
            disabled={checkingStatus || timeLeft <= 0}
          >
            {checkingStatus ? 'Verifying Payment...' : 'I Have Completed Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}