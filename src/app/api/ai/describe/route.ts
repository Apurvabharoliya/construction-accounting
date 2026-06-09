import { NextRequest, NextResponse } from 'next/server'

interface RecordData {
  id: string
  [key: string]: any
}

interface DescribeRequest {
  type: 'beneficiary' | 'party' | 'purchase' | 'sale'
  records: RecordData[]
}

function buildPrompt(type: string, records: RecordData[]): string {
  const items = records.map((r, i) => {
    switch (type) {
      case 'beneficiary':
        return `${i + 1}. ${r.party?.name || 'Unknown'} — Aadhaar: ${r.aadhaar_number || 'N/A'}, Scheme: ${r.subsidy_scheme || 'N/A'}, Status: ${r.subsidy_status || 'pending'}, Progress: ${r.construction_progress || 0}%, Sanctioned: ₹${Number(r.subsidy_amount_sanctioned || 0).toLocaleString('en-IN')}`
      case 'party':
        return `${i + 1}. ${r.name} — Type: ${r.party_type}, City: ${r.city || 'N/A'}, State: ${r.state || 'N/A'}, GST: ${r.gst_registered ? 'Registered' : 'Not registered'}, Balance: ₹${Number(r.opening_balance || 0).toLocaleString('en-IN')}`
      case 'purchase':
        return `${i + 1}. ${r.purchase_number} — Supplier: ${r.supplier?.name || 'N/A'}, Total: ₹${Number(r.total_amount || 0).toLocaleString('en-IN')}, Paid: ₹${Number(r.amount_paid || 0).toLocaleString('en-IN')}, Status: ${r.payment_status || 'unpaid'}`
      case 'sale':
        return `${i + 1}. ${r.sale_number} — Client: ${r.client?.name || 'N/A'}, Total: ₹${Number(r.total_amount || 0).toLocaleString('en-IN')}, Received: ₹${Number(r.amount_received || 0).toLocaleString('en-IN')}, Status: ${r.payment_status || 'unpaid'}`
      default:
        return `${i + 1}. Record ${r.id}`
    }
  })

  return `You are a helpful assistant. For each item below, write ONE concise, descriptive sentence (max 15 words) summarizing the key information. Return ONLY a JSON array of strings, one per item, in the same order. No markdown, no numbering, just the JSON array.

Items:
${items.join('\n')}`
}

export async function POST(request: NextRequest) {
  try {
    const body: DescribeRequest = await request.json()
    const { type, records } = body

    if (!type || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Invalid request: type and records required' }, { status: 400 })
    }

    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 })
    }

    const prompt = buildPrompt(type, records)

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NVIDIA API error:', response.status, errorText)
      return NextResponse.json({ error: 'AI service error', details: errorText }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    
    // Parse the JSON array from the response
    let descriptions: string[]
    try {
      // Clean the response - remove markdown code fences if present
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      descriptions = JSON.parse(cleaned)
    } catch {
      // Fallback: try to extract array from the text
      const match = content.match(/\[[\s\S]*?\]/)
      if (match) {
        try {
          descriptions = JSON.parse(match[0])
        } catch {
          descriptions = records.map(() => 'Description unavailable')
        }
      } else {
        descriptions = records.map(() => 'Description unavailable')
      }
    }

    // Map descriptions back to record IDs
    const result = records.map((record, index) => ({
      id: record.id,
      description: descriptions[index] || 'Description unavailable'
    }))

    return NextResponse.json({ descriptions: result })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
