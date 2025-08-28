const express = require('express');
const router = express.Router();
const Winner = require('../models/Winner');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// GET /api/winners - Get all winners with pagination and search
router.get('/winners', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    const skip = (page - 1) * limit;
    
    // Build search query
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { wcode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const winners = await Winner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Winner.countDocuments(query);
    
    res.json({
      winners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching winners:', error);
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// GET /api/winners/public - Get public winners (for display on website)
router.get('/winners/public', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const winners = await Winner.find({ 
      isActive: true, 
      status: 'Approved' 
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name phone image wcode createdAt');
    
    // Mask phone numbers for privacy (show only first 2 and last 2 digits)
    const maskedWinners = winners.map(winner => ({
      ...winner.toObject(),
      phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2')
    }));
    
    res.json(maskedWinners);
  } catch (error) {
    console.error('Error fetching public winners:', error);
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// POST /api/winners/upload - Upload Excel file and import winners
router.post('/winners/upload', requireAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    let imported = 0;
    let errors = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        const winnerData = {
          id: row.ID || row.Id || row.id || `W${Date.now()}_${i}`,
          phone: row.Phone || row['Phone No'] || row.Mobile || row.phone || '',
          name: row.Name || row.FullName || row.name || '',
          address: row.Address || row.address || '',
          paid: row.Paid || row.paid || row.Amount || '',
          product: row.Product || row.product || '',
          prizeAmount: row.PrizeAmount || row['Prize Amount'] || row.prizeAmount || row.Amount || '',
          date: row.Date || row.date || new Date().toISOString().split('T')[0],
          status: row.Status || row.status || 'Pending',
          wcode: row.WCode || row['W-Code'] || row.wcode || `WC${Date.now()}_${i}`
        };
        
        // Check if winner already exists
        const existingWinner = await Winner.findOne({
          $or: [
            { id: winnerData.id },
            { wcode: winnerData.wcode },
            { phone: winnerData.phone }
          ]
        });
        
        if (existingWinner) {
          errors.push(`Row ${i + 1}: Winner already exists (${winnerData.name})`);
          continue;
        }
        
        const winner = new Winner(winnerData);
        await winner.save();
        imported++;
        
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'Import completed',
      imported,
      errors,
      total: jsonData.length
    });
    
  } catch (error) {
    console.error('Error importing winners:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to import winners' });
  }
});

// PUT /api/winners/:id - Update winner
router.put('/winners/:id', requireAuth, async (req, res) => {
  try {
    const winner = await Winner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!winner) {
      return res.status(404).json({ error: 'Winner not found' });
    }
    
    res.json(winner);
  } catch (error) {
    console.error('Error updating winner:', error);
    res.status(500).json({ error: 'Failed to update winner' });
  }
});

// DELETE /api/winners/:id - Delete winner
router.delete('/winners/:id', requireAuth, async (req, res) => {
  try {
    const winner = await Winner.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!winner) {
      return res.status(404).json({ error: 'Winner not found' });
    }
    
    res.json({ message: 'Winner deleted successfully' });
  } catch (error) {
    console.error('Error deleting winner:', error);
    res.status(500).json({ error: 'Failed to delete winner' });
  }
});

// GET /api/stats - Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalWinners = await Winner.countDocuments({ isActive: true });
    const pendingWinners = await Winner.countDocuments({ isActive: true, status: 'Pending' });
    const approvedWinners = await Winner.countDocuments({ isActive: true, status: 'Approved' });
    const paidWinners = await Winner.countDocuments({ isActive: true, status: 'Paid' });
    
    res.json({
      totalWinners,
      pendingWinners,
      approvedWinners,
      paidWinners
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
