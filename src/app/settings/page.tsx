'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Calculator, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    business_name: '',
    business_address: '',
    business_gstin: '',
    business_pan: '',
    business_phone: '',
    business_email: '',
    state_code: '27', // Default Maharashtra
    financial_year_start: 'April'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('business_settings').select('*')
    if (data) {
      const settingsMap: Record<string, string> = {}
      data.forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value })
      setSettings(prev => ({ ...prev, ...settingsMap }))
    }
  }

  async function saveSettings() {
    setLoading(true)
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value)
      }))

      // Upsert each setting
      for (const entry of entries) {
        const { data: existing } = await supabase
          .from('business_settings')
          .select('id')
          .eq('setting_key', entry.setting_key)
          .single()

        if (existing) {
          await supabase.from('business_settings').update(entry).eq('setting_key', entry.setting_key)
        } else {
          await supabase.from('business_settings').insert(entry)
        }
      }

      toast.success('Settings saved successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your business and application settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b px-6">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab('profile')} className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
              <Building2 className="w-4 h-4 inline mr-2" />Business Profile
            </button>
            <button onClick={() => setActiveTab('tax')} className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tax' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
              <Calculator className="w-4 h-4 inline mr-2" />Tax Configuration
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input type="text" value={settings.business_name} onChange={(e) => setSettings(p => ({ ...p, business_name: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Your business name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={settings.business_phone} onChange={(e) => setSettings(p => ({ ...p, business_phone: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Business phone" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input type="text" value={settings.business_gstin} onChange={(e) => setSettings(p => ({ ...p, business_gstin: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input type="text" value={settings.business_pan} onChange={(e) => setSettings(p => ({ ...p, business_pan: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="AAAAA0000A" maxLength={10} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={settings.business_address} onChange={(e) => setSettings(p => ({ ...p, business_address: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Business address" />
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Code (for GST)</label>
                  <select value={settings.state_code} onChange={(e) => setSettings(p => ({ ...p, state_code: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="27">Maharashtra (27)</option>
                    <option value="07">Delhi (07)</option>
                    <option value="33">Tamil Nadu (33)</option>
                    <option value="29">Karnataka (29)</option>
                    <option value="36">Telangana (36)</option>
                    <option value="12">Uttarakhand (12)</option>
                    <option value="09">Uttar Pradesh (09)</option>
                    <option value="10">Bihar (10)</option>
                    <option value="19">West Bengal (19)</option>
                    <option value="08">Rajasthan (08)</option>
                    <option value="23">Madhya Pradesh (23)</option>
                    <option value="24">Gujarat (24)</option>
                    <option value="06">Haryana (06)</option>
                    <option value="03">Punjab (03)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start</label>
                  <select value={settings.financial_year_start} onChange={(e) => setSettings(p => ({ ...p, financial_year_start: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="April">April (Indian Standard)</option>
                    <option value="January">January (Calendar Year)</option>
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">GST Configuration Info</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• CGST and SGST apply for intra-state transactions (same state)</li>
                  <li>• IGST applies for inter-state transactions (different states)</li>
                  <li>• Construction services: 1% (affordable), 5% (other), 12% (commercial)</li>
                  <li>• Materials: Cement 18%, Steel 18%, Sand 5%, Bricks 5-12%</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={saveSettings} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
