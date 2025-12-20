'use client'

import { X } from 'lucide-react'

interface LineItem {
  lineItemID?: string
  description?: string
  quantity?: number
  unitAmount?: number
  accountCode?: string
  accountID?: string
  taxType?: string
  taxAmount?: number
  lineAmount?: number
  tracking?: Array<{ name?: string; option?: string }>
  itemCode?: string
}

interface LineItemsModalProps {
  isOpen: boolean
  onClose: () => void
  lineItems: LineItem[]
  invoiceNumber?: string
  contactName?: string
  date?: string
}

export default function LineItemsModal({
  isOpen,
  onClose,
  lineItems,
  invoiceNumber,
  contactName,
  date,
}: LineItemsModalProps) {
  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1D1D1D] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Line Items</h2>
            {invoiceNumber && (
              <p className="text-sm text-gray-400 mt-1">
                Invoice: {invoiceNumber}
                {contactName && ` • ${contactName}`}
                {date && ` • ${formatDate(date)}`}
              </p>
            )}
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
          {lineItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">No line items found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Unit Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Account
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Tracking
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Tax Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Line Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((lineItem, index) => {
                    const trackingCategories = lineItem.tracking || []
                    const trackingDisplay = trackingCategories.length > 0
                      ? trackingCategories.map((t: any) => t.name || t.option || "").join(", ")
                      : ""

                    return (
                      <tr
                        key={lineItem.lineItemID || index}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-white font-medium">
                          {lineItem.description || lineItem.itemCode || ""}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-300">
                          {lineItem.quantity || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-white">
                          {formatCurrency(lineItem.unitAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300">
                          {lineItem.accountCode || ""}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300">
                          {trackingDisplay || ""}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-300">
                          {formatCurrency(lineItem.taxAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-white">
                          {formatCurrency(lineItem.lineAmount || 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/10">
                    <td colSpan={6} className="py-4 px-4 text-right text-sm font-semibold text-white">
                      Total:
                    </td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-white">
                      {formatCurrency(
                        lineItems.reduce((sum, item) => sum + (item.lineAmount || 0), 0)
                      )}
                    </td>
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
    </div>
  )
}
