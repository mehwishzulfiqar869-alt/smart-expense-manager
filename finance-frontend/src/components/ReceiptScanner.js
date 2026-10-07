import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';

const ReceiptScanner = ({ onDataExtracted, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } };
      handleImageSelect(fakeEvent);
    }
  };

  // Parse individual line items from receipt text - IMPROVED
  const parseReceiptItems = (text) => {
    console.log('Raw OCR Text:', text);
    
    const lines = text.split('\n');
    const items = [];
    let currentDate = null;
    let merchant = 'Store Receipt';
    let totalAmount = null;
    let totalQty = 0;
    
    // Extract date - fixed regex without unnecessary escapes
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch) {
      try {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate)) {
          currentDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    if (!currentDate) {
      currentDate = new Date().toISOString().split('T')[0];
    }
    
    // Extract total amount - look for payable, total, or amount
    const totalPatterns = [
      /payable[:\s]*\$?(\d+[,.]?\d*\.?\d{2})/i,
      /total[:\s]*\$?(\d+[,.]?\d*\.?\d{2})/i,
      /amount[:\s]*\$?(\d+[,.]?\d*\.?\d{2})/i,
      /\$?(\d{2,5}\.\d{2})\s*$/
    ];
    
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        totalAmount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // Extract quantity
    const qtyMatch = text.match(/total qty[:\s]*(\d+)/i);
    if (qtyMatch) {
      totalQty = parseInt(qtyMatch[1]);
    }
    
    // Try to find merchant/store name
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      if (line && line.length > 3 && line.length < 50) {
        if (!line.match(/qty|total|tax|discount|fee|payable|subtotal|\d+\.\d{2}/i) && 
            !line.match(/^[0-9\s]+$/)) {
          merchant = line;
          break;
        }
      }
    }
    
    // Skip lines that are summary/total lines
    const skipPatterns = [
      /subtotal/i, /total/i, /tax/i, /amount/i, /paid/i,
      /fee/i, /discount/i, /payable/i, /qty/i, /balance/i,
      /change/i, /card/i, /cash/i, /visa/i, /mastercard/i,
      /thank/i, /visit/i, /store/i, /address/i, /phone/i,
      /^[0-9\s]+$/, /^[A-Z]{2,}\s+[0-9]{5}$/i,
      /receipt/i, /item/i, /qty/i, /price/i
    ];
    
    // Extract individual items from the text
    // Look for patterns like "ITEM NAME $XX.XX" or "ITEM NAME XX.XX"
    const itemPattern = /^([A-Za-z0-9\s&-]+)\s*\$?(\d+[,.]?\d*\.?\d{2})/i;
    
    // Also look for patterns with comma (e.g., "Item Name 1,000.00")
    const itemPatternComma = /^([A-Za-z0-9\s&-]+)\s*\$?(\d{1,3}(?:[,.]\d{3})*\.\d{2})/i;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Skip if line matches any skip pattern
      let shouldSkip = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(trimmedLine)) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) continue;
      
      // Try to match item with price (with comma)
      let match = trimmedLine.match(itemPatternComma);
      if (match) {
        let itemName = match[1].trim();
        let itemPrice = parseFloat(match[2].replace(/,/g, ''));
        
        // Clean up item name
        itemName = itemName.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9\s&-]$/, '');
        
        if (itemPrice > 0 && itemPrice < 100000 && itemName.length > 2) {
          items.push({
            name: itemName,
            amount: itemPrice,
            description: `Receipt item: ${itemName}`
          });
        }
      }
      
      // Try to match item with price (without comma)
      if (!match) {
        match = trimmedLine.match(itemPattern);
        if (match) {
          let itemName = match[1].trim();
          let itemPrice = parseFloat(match[2].replace(/,/g, ''));
          
          // Clean up item name
          itemName = itemName.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9\s&-]$/, '');
          
          if (itemPrice > 0 && itemPrice < 100000 && itemName.length > 2) {
            items.push({
              name: itemName,
              amount: itemPrice,
              description: `Receipt item: ${itemName}`
            });
          }
        }
      }
    }
    
    // If no items found but we have total and quantity, create generic items
    if (items.length === 0 && totalAmount > 0 && totalQty > 0) {
      const perItemPrice = totalAmount / totalQty;
      for (let i = 1; i <= totalQty; i++) {
        items.push({
          name: `Item ${i}`,
          amount: perItemPrice,
          description: `Item ${i} from receipt`
        });
      }
      console.log(`Created ${items.length} generic items from receipt`);
    }
    
    // If still no items and we have total amount, create one generic item
    if (items.length === 0 && totalAmount > 0) {
      items.push({
        name: 'Receipt Total',
        amount: totalAmount,
        description: 'Total from receipt'
      });
      console.log('Created 1 generic item from receipt total');
    }
    
    // Remove duplicates
    const uniqueItems = [];
    const seenNames = new Set();
    for (const item of items) {
      const normalizedName = item.name.toLowerCase().substring(0, 20);
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        uniqueItems.push(item);
      }
    }
    
    console.log('Parsed items:', uniqueItems);
    console.log('Total amount:', totalAmount);
    
    return {
      items: uniqueItems,
      merchant: merchant || 'Unknown Store',
      date: currentDate,
      totalAmount: totalAmount || uniqueItems.reduce((sum, i) => sum + i.amount, 0),
      itemCount: uniqueItems.length,
      rawText: text
    };
  };

  const extractTextFromImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgress(0);
    setError('');

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const { data } = await worker.recognize(selectedImage);
      const text = data.text;
      console.log('Extracted text:', text);

      await worker.terminate();

      const parsedData = parseReceiptItems(text);
      setExtractedData(parsedData);

      if (parsedData.items.length === 0) {
        setError('No items detected. Please try a clearer receipt image.');
      }

    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process the receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted({
        items: extractedData.items,
        merchant: extractedData.merchant,
        date: extractedData.date,
        totalAmount: extractedData.totalAmount,
        description: `Receipt from ${extractedData.merchant} with ${extractedData.itemCount} items`
      });
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedData(null);
    setProgress(0);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Smart Receipt Scanner
              </h2>
              <p className="text-cyan-100 mt-1">Upload your receipt and let AI extract all items</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Upload Area */}
            <div>
              {!imagePreview ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer bg-gray-50"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drop your receipt here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      or click to browse
                    </p>
                    <div className="inline-block bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                      Choose File
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      Supports: JPG, PNG • Max size: 5MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="w-full rounded-lg border-2 border-gray-200"
                    />
                    {!extractedData && (
                      <button
                        onClick={handleReset}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {!isProcessing && !extractedData && (
                    <button
                      onClick={extractTextFromImage}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Scan Receipt with AI
                    </button>
                  )}

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Processing receipt...</span>
                        <span className="font-medium text-cyan-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Extracted Items */}
            <div>
              {extractedData ? (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6 border-2 border-cyan-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Extracted Items ({extractedData.itemCount})
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-medium text-gray-500">Store</label>
                      <p className="text-md font-semibold text-gray-800">{extractedData.merchant}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-medium text-gray-500">Date</label>
                      <p className="text-md font-semibold text-gray-800">
                        {new Date(extractedData.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Items Purchased</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {extractedData.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-sm text-gray-700">{item.name}</span>
                            <span className="text-sm font-semibold text-cyan-600">${item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {extractedData.totalAmount && (
                      <div className="bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">Total Amount:</span>
                          <span className="text-xl font-bold text-cyan-600">${extractedData.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={handleUseData}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Use All {extractedData.itemCount} Items
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Scan Another Receipt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div>
                    <svg className="mx-auto h-24 w-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Extracted items will appear here
                    </h3>
                    <p className="text-sm text-gray-500">
                      Upload a receipt and click "Scan" to extract all items
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Tips for Best Results
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-7">
              <li>• For best results, use a printed receipt with clear text</li>
              <li>• The receipt should have items in format: "ITEM NAME $XX.XX"</li>
              <li>• Avoid receipts with handwritten text</li>
              <li>• Take photo in good lighting, straight angle</li>
              <li>• For testing, create receipts on checkoutreceipt.com</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;