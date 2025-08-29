const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Winner = require('../models/Winner');
const BankDetails = require('../models/BankDetails');
const CompanyBankDetails = require('../models/CompanyBankDetails');
const Prize = require('../models/Prize');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configure multer for Excel uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/excel/';
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
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for prize image uploads
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const imagesDir = path.join(__dirname, '..', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '');
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, WEBP images allowed'));
    }
    cb(null, true);
  }
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    res.redirect('/admin/login');
  }
};

// Middleware to check if user is already authenticated
const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

// GET /admin - Redirect to dashboard
router.get('/', requireAuth, (req, res) => {
  res.redirect('/admin/dashboard');
});

// GET /admin/login - Show login page
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('admin/login', { 
    title: 'Admin Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /admin/login - Handle login
router.post('/login', redirectIfAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      req.flash('error', 'Username and password are required');
      return res.redirect('/admin/login');
    }
    
    const admin = await Admin.findOne({ username, isActive: true });
    
    if (!admin || !(await admin.comparePassword(password))) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/admin/login');
    }
    
    // Update last login
    await admin.updateLastLogin();
    
    // Set session
    req.session.adminId = admin._id;
    req.session.adminUsername = admin.username;
    req.session.adminRole = admin.role;
    
    req.flash('success', 'Login successful');
    res.redirect('/admin/dashboard');
    
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'An error occurred during login');
    res.redirect('/admin/login');
  }
});

// GET /admin/logout - Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
});

// GET /admin/dashboard - Show dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const stats = {
      totalWinners: await Winner.countDocuments({ isActive: true }),
      pendingWinners: await Winner.countDocuments({ isActive: true, status: 'Pending' }),
      approvedWinners: await Winner.countDocuments({ isActive: true, status: 'Approved' }),
      paidWinners: await Winner.countDocuments({ isActive: true, status: 'Paid' })
    };
    
    const recentWinners = await Winner.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentWinners,
      adminUsername: req.session.adminUsername,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/admin/login');
  }
});

// GET /admin/winners - Show winners management page
router.get('/winners', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
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
    const totalPages = Math.ceil(total / limit);
    
    res.render('admin/winners', {
      title: 'Winners Management',
      winners,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      },
      search,
      status,
      adminUsername: req.session.adminUsername,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Winners page error:', error);
    req.flash('error', 'Error loading winners');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/winners - Create new winner
router.post('/winners', requireAuth, async (req, res) => {
  try {
    const { name, phone, wcode, prizeAmount, status, id, address, product, date, paid } = req.body;

    if (!name || !phone || !wcode || !prizeAmount || !id || !address || !product || !date || !paid) {
      req.flash('error', 'All required fields must be filled');
      return res.redirect('/admin/winners');
    }

    // Check if winner already exists
    const existingWinner = await Winner.findOne({
      $or: [{ phone }, { wcode }, { id }]
    });

    if (existingWinner) {
      req.flash('error', 'Winner with this phone number, W-Code, or ID already exists');
      return res.redirect('/admin/winners');
    }

    const winner = new Winner({
      id,
      name,
      phone,
      address,
      paid,
      product,
      prizeAmount,
      date,
      wcode,
      status: status || 'Active',
      isActive: true
    });

    await winner.save();
    req.flash('success', 'Winner added successfully');
    res.redirect('/admin/winners');
  } catch (error) {
    console.error('Add winner error:', error);
    req.flash('error', 'Error adding winner: ' + error.message);
    res.redirect('/admin/winners');
  }
});

// DELETE /admin/winners/:id - Delete winner
router.delete('/winners/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const winner = await Winner.findByIdAndDelete(id);

    if (!winner) {
      return res.json({ success: false, message: 'Winner not found' });
    }

    res.json({ success: true, message: 'Winner deleted successfully' });
  } catch (error) {
    console.error('Delete winner error:', error);
    res.json({ success: false, message: 'Error deleting winner' });
  }
});

// GET /admin/upload - Show upload page
router.get('/upload', requireAuth, (req, res) => {
  res.render('admin/upload', {
    title: 'Upload Excel File',
    adminUsername: req.session.adminUsername,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// POST /admin/upload - Handle Excel file upload
router.post('/upload', requireAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error', 'Please select an Excel file to upload');
      return res.redirect('/admin/upload');
    }

    const filePath = req.file.path;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      req.flash('error', 'Excel file is empty or has no data');
      return res.redirect('/admin/upload');
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];

        // Map Excel columns to database fields
        const winnerData = {
          id: row['ID'] || row['id'] || `AUTO_${Date.now()}_${i}`,
          phone: row['Phone No'] || row['phone'] || row['Phone'],
          name: row['Name'] || row['name'],
          address: row['Address'] || row['address'],
          paid: row['Paid'] || row['paid'],
          product: row['Product'] || row['product'],
          prizeAmount: row['Prize Amount:'] || row['Prize Amount'] || row['prizeAmount'],
          date: row['Date:'] || row['Date'] || row['date'],
          status: row['Status'] || row['status'] || 'Active',
          wcode: row['W-Code'] || row['wcode'] || `W${Date.now()}${i}`
        };

        // Validate required fields
        if (!winnerData.phone || !winnerData.name || !winnerData.address ||
            !winnerData.paid || !winnerData.product || !winnerData.prizeAmount || !winnerData.date) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          errorCount++;
          continue;
        }

        // Check if winner already exists
        const existingWinner = await Winner.findOne({
          $or: [
            { phone: winnerData.phone },
            { id: winnerData.id },
            { wcode: winnerData.wcode }
          ]
        });

        if (existingWinner) {
          errors.push(`Row ${i + 2}: Winner already exists (Phone: ${winnerData.phone})`);
          errorCount++;
          continue;
        }

        // Create new winner
        const winner = new Winner({
          ...winnerData,
          isActive: true
        });

        await winner.save();
        successCount++;

      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        errors.push(`Row ${i + 2}: ${error.message}`);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Prepare result message
    let message = `Upload completed: ${successCount} winners added successfully`;
    if (errorCount > 0) {
      message += `, ${errorCount} errors occurred`;
    }

    if (successCount > 0) {
      req.flash('success', message);
    } else {
      req.flash('error', 'No winners were added. Please check your Excel file format.');
    }

    if (errors.length > 0 && errors.length <= 10) {
      req.flash('error', 'Errors: ' + errors.join('; '));
    }

    res.redirect('/admin/upload');

  } catch (error) {
    console.error('Excel upload error:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    req.flash('error', 'Error processing Excel file: ' + error.message);
    res.redirect('/admin/upload');
  }
});

// GET /admin/download-template - Download Excel template
router.get('/download-template', requireAuth, (req, res) => {
  try {
    // Create a sample Excel template
    const templateData = [
      {
        'Phone No': '9876543210',
        'Name': 'John Doe',
        'Address': '123 Main Street, City, State',
        'Paid': 'Yes',
        'Product': 'Lucky Draw Prize',
        'Prize Amount:': '1000',
        'Date:': '2024-01-01',
        'Status': 'Approved'
      }
    ];

    // Create workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);

    // Add the worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Winners');

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename=winners_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Template download error:', error);
    req.flash('error', 'Error downloading template');
    res.redirect('/admin/upload');
  }
});

// GET /admin/settings - Show settings page
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    
    res.render('admin/settings', {
      title: 'Settings',
      admin,
      adminUsername: req.session.adminUsername,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Settings page error:', error);
    req.flash('error', 'Error loading settings');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/settings - Update admin settings
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/settings');
    }
    
    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        req.flash('error', 'Current password is required to change password');
        return res.redirect('/admin/settings');
      }
      
      if (!(await admin.comparePassword(currentPassword))) {
        req.flash('error', 'Current password is incorrect');
        return res.redirect('/admin/settings');
      }
      
      admin.password = newPassword;
    }
    
    // Update email if provided
    if (email) {
      admin.email = email;
    }
    
    await admin.save();
    
    req.flash('success', 'Settings updated successfully');
    res.redirect('/admin/settings');
    
  } catch (error) {
    console.error('Settings update error:', error);
    req.flash('error', 'Error updating settings');
    res.redirect('/admin/settings');
  }
});

// GET /admin/bank-details - Show bank details page
router.get('/bank-details', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    // Build search query
    let query = { isActive: true };

    if (search) {
      query.$or = [
        { winnerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { accountHolderName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const bankDetails = await BankDetails.find(query)
      .populate('winnerId', 'name phone wcode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BankDetails.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.render('admin/bank-details', {
      title: 'Bank Details Management',
      adminUsername: req.session.adminUsername,
      bankDetails,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      },
      search,
      status,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Bank details error:', error);
    req.flash('error', 'Error loading bank details');
    res.redirect('/admin/dashboard');
  }
});

// GET /admin/bank-update - Show bank update page
router.get('/bank-update', requireAuth, (req, res) => {
  res.render('admin/bank-update', {
    title: 'Bank Update',
    adminUsername: req.session.adminUsername,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// POST /admin/bank-update - Handle bank update
router.post('/bank-update', requireAuth, async (req, res) => {
  try {
    const { phone, winnerName, bankName, accountNumber, ifscCode, accountHolderName, prizeAmount, status, notes, branchName } = req.body;

    if (!phone || !winnerName || !bankName || !accountNumber || !ifscCode || !accountHolderName) {
      req.flash('error', 'All required fields must be filled');
      return res.redirect('/admin/bank-update');
    }

    // Find the winner first
    const winner = await Winner.findOne({ phone, isActive: true });
    if (!winner) {
      req.flash('error', 'Winner not found with the provided phone number');
      return res.redirect('/admin/bank-update');
    }

    // Check if bank details already exist for this winner
    let bankDetails = await BankDetails.findOne({ winnerId: winner._id, isActive: true });

    if (bankDetails) {
      // Update existing bank details
      bankDetails.winnerName = winnerName;
      bankDetails.bankName = bankName;
      bankDetails.accountNumber = accountNumber;
      bankDetails.ifscCode = ifscCode.toUpperCase();
      bankDetails.accountHolderName = accountHolderName;
      bankDetails.branchName = branchName || '';
      bankDetails.prizeAmount = parseFloat(prizeAmount) || winner.prizeAmount;
      bankDetails.status = status || 'Active';
      bankDetails.notes = notes || '';
      bankDetails.updatedBy = req.session.adminUsername || 'Admin';

      await bankDetails.save();
      req.flash('success', 'Bank details updated successfully');
    } else {
      // Create new bank details
      bankDetails = new BankDetails({
        winnerId: winner._id,
        winnerName,
        phone,
        wcode: winner.wcode,
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountHolderName,
        branchName: branchName || '',
        prizeAmount: parseFloat(prizeAmount) || winner.prizeAmount,
        status: status || 'Active',
        notes: notes || '',
        createdBy: req.session.adminUsername || 'Admin'
      });

      await bankDetails.save();
      req.flash('success', 'Bank details created successfully');
    }

    res.redirect('/admin/bank-details');
  } catch (error) {
    console.error('Bank update error:', error);
    req.flash('error', 'Error updating bank details: ' + error.message);
    res.redirect('/admin/bank-update');
  }
});

// GET /admin/update-prize - Show update prize page
router.get('/update-prize', requireAuth, (req, res) => {
  res.render('admin/update-prize', {
    title: 'Update Prize',
    adminUsername: req.session.adminUsername,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// POST /admin/update-prize - Handle prize update
router.post('/update-prize', requireAuth, async (req, res) => {
  try {
    const { phone, newPrizeAmount, prizeCategory, prizeStatus, updateDate, prizeDescription, updateReason } = req.body;

    // Here you would update the winner's prize in the database
    // For now, just flash success message

    req.flash('success', 'Prize updated successfully');
    res.redirect('/admin/winners');
  } catch (error) {
    console.error('Prize update error:', error);
    req.flash('error', 'Error updating prize');
    res.redirect('/admin/update-prize');
  }
});

// GET /admin/prize-request - Show prize requests page
router.get('/prize-request', requireAuth, async (req, res) => {
  try {
    // Mock data for now - replace with actual database query
    const prizeRequests = [
      {
        id: 1001,
        winnerName: 'Mukesh Kumar Yadav',
        phone: '9398475946',
        prizeAmount: 325,
        requestDate: new Date(),
        status: 'Active'
      },
      {
        id: 1002,
        winnerName: 'D Pavan',
        phone: '9392865232',
        prizeAmount: 324,
        requestDate: new Date(),
        status: 'Approved'
      }
    ];

    res.render('admin/prize-request', {
      title: 'Prize Request',
      adminUsername: req.session.adminUsername,
      prizeRequests,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Prize request error:', error);
    req.flash('error', 'Error loading prize requests');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/prize-request/update - Update prize request status
router.post('/prize-request/update', requireAuth, async (req, res) => {
  try {
    const { requestId, status } = req.body;

    // Here you would update the prize request status in the database
    // For now, just return success

    res.json({ success: true });
  } catch (error) {
    console.error('Prize request update error:', error);
    res.json({ success: false, message: error.message });
  }
});

// GET /admin/car-processing - Show car processing requests page
router.get('/car-processing', requireAuth, async (req, res) => {
  try {
    // Mock data for now - replace with actual database query
    const carRequests = [
      {
        id: 2001,
        winnerName: 'Mohan Krishna',
        phone: '9391446450',
        carModel: 'Maruti Swift',
        prizeValue: 500000,
        requestDate: new Date(),
        status: 'New'
      },
      {
        id: 2002,
        winnerName: 'Baby Gaming',
        phone: '9387181414',
        carModel: 'Hyundai i20',
        prizeValue: 600000,
        requestDate: new Date(),
        status: 'Processing'
      }
    ];

    res.render('admin/car-processing', {
      title: 'Car Processing Request',
      adminUsername: req.session.adminUsername,
      carRequests,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Car processing error:', error);
    req.flash('error', 'Error loading car processing requests');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/car-processing/update - Update car processing status
router.post('/car-processing/update', requireAuth, async (req, res) => {
  try {
    const { requestId, status } = req.body;

    // Here you would update the car processing status in the database
    // For now, just return success

    res.json({ success: true });
  } catch (error) {
    console.error('Car processing update error:', error);
    res.json({ success: false, message: error.message });
  }
});

// GET /admin/company-bank - Manage company bank details
router.get('/company-bank', requireAuth, async (req, res) => {
  try {
    const companyBankDetails = await CompanyBankDetails.getAllActive();

    res.render('admin/company-bank', {
      title: 'Company Bank Details',
      adminUsername: req.session.adminUsername,
      companyBankDetails,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Company bank details error:', error);
    req.flash('error', 'Error loading company bank details');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/company-bank - Create/Update company bank details
router.post('/company-bank', requireAuth, async (req, res) => {
  try {
    const {
      companyName, bankName, accountNumber, ifscCode, accountHolderName,
      branchName, branchAddress, accountType, purpose, displayName,
      description, instructions, contactPhone, contactEmail, upiId, isPrimary
    } = req.body;

    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      req.flash('error', 'All required bank fields must be filled');
      return res.redirect('/admin/company-bank');
    }

    const companyBankDetails = new CompanyBankDetails({
      companyName: companyName || 'Herbal Ayurveda Pvt. Ltd.',
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      branchName: branchName || '',
      branchAddress: branchAddress || '',
      accountType: accountType || 'Current',
      purpose: purpose || 'Prize Distribution',
      displayName: displayName || 'Prize Distributor Department',
      description: description || '',
      instructions: instructions || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      upiId: upiId || '',
      isPrimary: isPrimary === 'on',
      createdBy: req.session.adminUsername || 'Admin'
    });

    await companyBankDetails.save();
    req.flash('success', 'Company bank details added successfully');
    res.redirect('/admin/company-bank');
  } catch (error) {
    console.error('Company bank creation error:', error);
    req.flash('error', 'Error creating company bank details: ' + error.message);
    res.redirect('/admin/company-bank');
  }
});

// DELETE /admin/company-bank/:id - Delete company bank details
router.delete('/company-bank/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const companyBankDetails = await CompanyBankDetails.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: req.session.adminUsername || 'Admin' },
      { new: true }
    );

    if (!companyBankDetails) {
      return res.json({ success: false, message: 'Company bank details not found' });
    }

    res.json({ success: true, message: 'Company bank details deleted successfully' });
  } catch (error) {
    console.error('Delete company bank error:', error);
    res.json({ success: false, message: 'Error deleting company bank details' });
  }
});

// ==================== PRIZE MANAGEMENT ROUTES ====================

// Get all prizes
router.get('/prizes', requireAuth, async (req, res) => {
  try {
    const prizes = await Prize.find().sort({ position: 1 });
    res.render('admin/prizes', {
      title: 'Prize Management',
      adminUsername: req.session.adminUsername,
      prizes,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error fetching prizes:', error);
    req.flash('error', 'Error loading prizes');
    res.redirect('/admin/dashboard');
  }
});

// Add new prize
router.post('/prizes/add', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    const { title, description, amount, position, emoji, medal } = req.body;

    if (!req.file) {
      req.flash('error', 'Image is required and must be JPG, PNG, or WEBP under 2MB');
      return res.redirect('/admin/prizes');
    }

    const newPrize = new Prize({
      title,
      description,
      amount: parseInt(amount),
      image: req.file.filename,
      position: parseInt(position),
      emoji: emoji || '🏆',
      medal: medal || '🏆'
    });

    await newPrize.save();
    req.flash('success', 'Prize added successfully!');
    res.redirect('/admin/prizes');
  } catch (error) {
    console.error('Error adding prize:', error);
    req.flash('error', 'Error adding prize: ' + error.message);
    res.redirect('/admin/prizes');
  }
});

// Update prize
router.post('/prizes/update/:id', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    const { title, description, amount, position, emoji, medal, isActive, existingImage } = req.body;

    const updateDoc = {
      title,
      description,
      amount: parseInt(amount),
      position: parseInt(position),
      emoji: emoji || '🏆',
      medal: medal || '🏆',
      isActive: isActive === 'on'
    };

    if (req.file) {
      updateDoc.image = req.file.filename;
    } else if (existingImage) {
      updateDoc.image = existingImage;
    }

    await Prize.findByIdAndUpdate(req.params.id, updateDoc);

    req.flash('success', 'Prize updated successfully!');
    res.redirect('/admin/prizes');
  } catch (error) {
    console.error('Error updating prize:', error);
    req.flash('error', 'Error updating prize: ' + error.message);
    res.redirect('/admin/prizes');
  }
});

// Delete prize
router.post('/prizes/delete/:id', requireAuth, async (req, res) => {
  try {
    await Prize.findByIdAndDelete(req.params.id);
    req.flash('success', 'Prize deleted successfully!');
    res.redirect('/admin/prizes');
  } catch (error) {
    console.error('Error deleting prize:', error);
    req.flash('error', 'Error deleting prize: ' + error.message);
    res.redirect('/admin/prizes');
  }
});

// GET /admin/logout - Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
});

module.exports = router;
