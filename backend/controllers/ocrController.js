const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// @desc    Process receipt image and extract text
// @route   POST /api/ocr/scan-receipt
// @access  Private
const scanReceipt = async (req, res) => {
  try {
    if (!req.files || !req.files.receipt) {
      return res.status(400).json({ message: 'No receipt image uploaded' });
    }

    const receipt = req.files.receipt;
    const uploadPath = path.join(__dirname, '../uploads/', `receipt-${Date.now()}.jpg`);

    // Optimize image for better OCR results
    await sharp(receipt.data)
      .resize(1200) // Resize for better processing
      .sharpen()    // Enhance text
      .toFile(uploadPath);

    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(
      uploadPath,
      'eng',
      {
        logger: m => console.log(m) // Optional: see progress
      }
    );

    // Clean up uploaded file
    fs.unlinkSync(uploadPath);

    // Extract structured data from text
    const extractedData = extractReceiptData(text);

    res.json({
      success: true,
      extractedText: text,
      structuredData: extractedData
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ message: 'Error processing receipt', error: error.message });
  }
};

// Helper function to extract key information from receipt text
const extractReceiptData = (text) => {
  const lines = text.split('\n');
  
  // Extract total amount (look for patterns like Total, Amount, $)
  const totalRegex = /total[\s:]*[$]?\s*(\d+\.?\d*)/i;
  const amountRegex = /amount[\s:]*[$]?\s*(\d+\.?\d*)/i;
  const totalMatch = text.match(totalRegex) || text.match(amountRegex);
  
  // Extract date
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  
  // Extract merchant/vendor name (usually first few lines)
  const lines_array = text.split('\n').filter(line => line.trim().length > 0);
  const merchantName = lines_array[0] || 'Unknown';

  return {
    merchant: merchantName,
    amount: totalMatch ? parseFloat(totalMatch[1]) : null,
    date: dateMatch ? dateMatch[0] : null,
    items: [] // You can implement more sophisticated item extraction
  };
};

module.exports = { scanReceipt };