import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://eevquavwamubibejlktw.supabase.co',
  'sb_secret_ajAk2FLGyukCUFI3cSl0ew_crOw9cmB'
)

async function checkAndActivate() {
  console.log('🔄 Checking for WhatsApp users...')
  const { data: users, error } = await supabase
    .from('whatsapp_users')
    .select('*')
  
  if (error) {
    console.error('❌ Error fetching users:', error)
    return
  }

  if (!users || users.length === 0) {
    console.log('⚠️ No users found in whatsapp_users table.')
    return
  }

  console.log(`✅ Found ${users.length} users. Activating all permanently...`)

  const { error: updateError } = await supabase
    .from('whatsapp_users')
    .update({ is_active: true })
    .eq('is_active', false)
  
  if (updateError) {
    console.error('❌ Error activating users:', updateError)
  } else {
    console.log('🚀 BOT ACTIVATED PERMANENTLY for all users!')
  }
}

checkAndActivate()
