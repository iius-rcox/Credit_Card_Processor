<template>
  <div class="exceptions-line-items">
    <div v-if="!available" class="text-sm text-gray-500">No line items available.</div>
    <div v-else>
      <div class="tabs flex space-x-4 mb-3">
        <button :class="tabClass('all')" @click="active='all'">All</button>
        <button :class="tabClass('matched')" @click="active='matched'">Matched</button>
        <button :class="tabClass('unmatched')" @click="active='unmatched'">Unmatched</button>
      </div>

      <div v-if="active==='all'">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 class="font-semibold text-gray-800 mb-2">Receipt Lines</h5>
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="px-2 py-1 text-left">Amount</th>
                  <th class="px-2 py-1 text-left">Vendor/Desc</th>
                  <th class="px-2 py-1 text-left">Date</th>
                  <th class="px-2 py-1 text-left">Page</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in receiptLines" :key="`r-${idx}`" class="border-t">
                  <td class="px-2 py-1 font-mono text-green-700">{{ formatAmount(r.amount) }}</td>
                  <td class="px-2 py-1">{{ r.vendor_candidate || r.category || r.descriptor || '—' }}</td>
                  <td class="px-2 py-1">{{ r.date_candidate || '—' }}</td>
                  <td class="px-2 py-1">{{ (r.page_range && r.page_range[0]) || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h5 class="font-semibold text-gray-800 mb-2">CAR Lines</h5>
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="px-2 py-1 text-left">Amount</th>
                  <th class="px-2 py-1 text-left">Category/Desc</th>
                  <th class="px-2 py-1 text-left">Page</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, idx) in carLines" :key="`c-${idx}`" class="border-t">
                  <td class="px-2 py-1 font-mono text-blue-700">{{ formatAmount(c.amount) }}</td>
                  <td class="px-2 py-1">{{ c.category || c.descriptor || '—' }}</td>
                  <td class="px-2 py-1">{{ (c.page_range && c.page_range[0]) || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else-if="active==='matched'">
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="px-2 py-1 text-left">Amount</th>
              <th class="px-2 py-1 text-left">Receipt</th>
              <th class="px-2 py-1 text-left">CAR</th>
              <th class="px-2 py-1 text-left">Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in matches" :key="`m-${idx}`" class="border-t">
              <td class="px-2 py-1 font-mono">{{ formatAmount(m.amount || m.amount_receipt || m.amount_car) }}</td>
              <td class="px-2 py-1">{{ summarizeReceipt(m.receipt) }}</td>
              <td class="px-2 py-1">{{ summarizeCar(m.car) }}</td>
              <td class="px-2 py-1">
                <span :class="confidenceClass(m.confidence)">{{ (m.confidence || 'low').toUpperCase() }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 class="font-semibold text-gray-800 mb-2">Unmatched Receipts</h5>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(r, idx) in (unmatched && unmatched.receipts) || []" :key="`ur-${idx}`">
                {{ formatAmount(r.amount) }} — {{ r.vendor_candidate || r.category || '—' }}
              </li>
            </ul>
          </div>
          <div>
            <h5 class="font-semibold text-gray-800 mb-2">Unmatched CAR</h5>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(c, idx) in (unmatched && unmatched.car) || []" :key="`uc-${idx}`">
                {{ formatAmount(c.amount) }} — {{ c.category || c.descriptor || '—' }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  carLines: { type: Array, default: () => [] },
  receiptLines: { type: Array, default: () => [] },
  matches: { type: Array, default: () => [] },
  unmatched: { type: Object, default: () => ({ car: [], receipts: [] }) },
  available: { type: Boolean, default: false }
})

const active = ref('all')

function formatAmount(v) {
  if (v == null || Number.isNaN(Number(v))) return '$0.00'
  const num = Number(v)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

function tabClass(tab) {
  return [
    'px-3 py-1.5 rounded-md text-sm border',
    active.value === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  ]
}

function summarizeReceipt(r) {
  if (!r) return '—'
  return `${formatAmount(r.amount)} | ${r.vendor_candidate || r.category || '—'} | p${(r.page_range && r.page_range[0]) || '—'}`
}

function summarizeCar(c) {
  if (!c) return '—'
  return `${formatAmount(c.amount)} | ${c.category || c.descriptor || '—'} | p${(c.page_range && c.page_range[0]) || '—'}`
}

function confidenceClass(level) {
  const map = { high: 'text-green-700', medium: 'text-yellow-700', low: 'text-gray-700' }
  return map[level || 'low']
}
</script>

<style scoped>
.exceptions-line-items { @apply p-3 rounded-md border border-gray-200 bg-white; }
th { @apply text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-50 border-b border-gray-200; }
td { @apply text-sm text-gray-800; }
</style>



