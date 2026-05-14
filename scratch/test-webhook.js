const fetch = require('node-fetch');

async function testWebhook() {
  const url = 'https://eevquavwamubibejlktw.supabase.co/functions/v1/whatsapp-incoming';
  
  // A standard Meta WhatsApp webhook payload
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551367989',
            phone_number_id: '100000000000000' // Needs to be the real phone_number_id if possible. 
          },
          messages: [{
            from: '917337474159',
            id: 'wamid.test.123',
            timestamp: Date.now().toString(),
            text: {
              body: 'Hlo'
            },
            type: 'text'
          }]
        }
      }]
    }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

testWebhook();
