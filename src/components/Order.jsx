import React, { useState } from 'react';

const Order = () => {
  const [diningOption, setDiningOption] = useState('dine-in');
  const [tableId, setTableId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Set table_id to null for takeout
    const payload = {
      order_type: diningOption,
      table_id: diningOption === 'takeout' ? null : tableId,
      // other fields...
    };

    // Clear error when switching tabs
    if (errorMessage) setErrorMessage('');

    // Submit to API
    fetch('/api/orders/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .catch(err => setErrorMessage('Failed to place order'));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Dining Option:</label>
        <select value={diningOption} onChange={(e) => setDiningOption(e.target.value)}>
          <option value="dine-in">Dine-In</option>
          <option value="takeout">Takeout</option>
        </select>
      </div>

      {diningOption === 'dine-in' && (
        <div>
          <label>Table ID:</label>
          <input 
            type="text" 
            value={tableId} 
            onChange={(e) => setTableId(e.target.value)}
            placeholder="Enter table ID"
          />
          {errorMessage && <p style={{color: 'red'}}>{errorMessage}</p>}
        </div>
      )}

      <button type="submit">Place Order</button>
    </form>
  );
};

export default Order;