'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import LineItemsModal from './LineItemsModal'

interface ExpenseDetail {
  date: string
  transactionType: string
  docNumber: string
  name: string
  class: string
  memo: string
  split: string
  amount: number
  balance: number
  lineItems?: any[]
  invoiceId?: string
}

interface ExpenseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  expenseName: string
  fromDate: string
  toDate: string
}

export default function ExpenseDetailModal({
  isOpen,
  onClose,
  expenseName,
  fromDate,
  toDate,
}: ExpenseDetailModalProps) {
  const [details, setDetails] = useState<ExpenseDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<string>('')
  const isFetchingRef = useRef<boolean>(false)
  const [selectedLineItems, setSelectedLineItems] = useState<{
    lineItems: any[]
    invoiceNumber?: string
    contactName?: string
    date?: string
  } | null>(null)
  const [isLineItemsModalOpen, setIsLineItemsModalOpen] = useState(false)

  useEffect(() => {
    if (isOpen && expenseName && fromDate && toDate) {
      const fetchKey = `${expenseName}-${fromDate}-${toDate}`
      
      // Only fetch if parameters changed and not already fetching
      if (lastFetchRef.current !== fetchKey && !isFetchingRef.current) {
        fetchExpenseDetails(fetchKey)
      }
    } else if (!isOpen) {
      // Reset when modal closes
      lastFetchRef.current = ''
      setDetails([])
      setError(null)
    }
  }, [isOpen, expenseName, fromDate, toDate])

  const fetchExpenseDetails = async (fetchKey: string) => {
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/dashboard/expense-detail?expenseName=${encodeURIComponent(expenseName)}&fromDate=${fromDate}&toDate=${toDate}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch expense details')
      }

      const data = await response.json()
      setDetails(data.details || [])
      lastFetchRef.current = fetchKey
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDetails([])
      lastFetchRef.current = ''
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1D1D1D] rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">{expenseName}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {formatDate(fromDate)} - {formatDate(toDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-[#E8E7BB] animate-spin" />
                <p className="text-sm text-gray-400">Loading expense details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={() => {
                    const fetchKey = `${expenseName}-${fromDate}-${toDate}`
                    lastFetchRef.current = ''
                    fetchExpenseDetails(fetchKey)
                  }}
                  className="px-4 py-2 bg-[#E8E7BB] text-[#1D1D1D] rounded-full font-medium hover:bg-[#d4d3a7] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : details.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">No expense details found for this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Class
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Memo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Split
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((detail, index) => (
                    <tr
                      key={index}
                      className={`border-b border-white/5 transition-colors ${
                        detail.lineItems && detail.lineItems.length > 0
                          ? 'hover:bg-white/10 cursor-pointer'
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => {
                        if (detail.lineItems && detail.lineItems.length > 0) {
                          setSelectedLineItems({
                            lineItems: detail.lineItems,
                            invoiceNumber: detail.docNumber,
                            contactName: detail.name,
                            date: detail.date,
                          })
                          setIsLineItemsModalOpen(true)
                        }
                      }}
                    >
                      <td className="py-3 px-4 text-sm text-white">
                        {formatDate(detail.date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {detail.transactionType}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {detail.docNumber}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-medium">
                        {detail.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {detail.class}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {detail.memo}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {detail.split}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-white">
                        {formatCurrency(detail.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-300">
                        {formatCurrency(detail.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/10">
                    <td colSpan={7} className="py-4 px-4 text-right text-sm font-semibold text-white">
                      Total:
                    </td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-white">
                      {formatCurrency(
                        details.reduce((sum, detail) => sum + detail.amount, 0)
                      )}
                    </td>
                    <td className="py-4 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#E8E7BB] text-[#1D1D1D] rounded-full font-medium hover:bg-[#d4d3a7] transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Line Items Modal */}
      {selectedLineItems && (
        <LineItemsModal
          isOpen={isLineItemsModalOpen}
          onClose={() => {
            setIsLineItemsModalOpen(false)
            setSelectedLineItems(null)
          }}
          lineItems={selectedLineItems.lineItems}
          invoiceNumber={selectedLineItems.invoiceNumber}
          contactName={selectedLineItems.contactName}
          date={selectedLineItems.date}
        />
      )}
    </div>
  )
}

