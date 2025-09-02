const express = require('express');
const router = express.Router();
const Winner = require('../models/Winner');
const CompanyBankDetails = require('../models/CompanyBankDetails');
const Prize = require('../models/Prize');
const path = require('path');

// GET / - Home page with dynamic data
router.get('/', async (req, res) => {
  try {
    // Get recent winners for homepage display - include all statuses
    const recentWinners = await Winner.find({
      isActive: true
      // Show all winners regardless of status
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name phone image wcode createdAt prizeAmount');

    // Mask phone numbers for privacy
    const maskedWinners = recentWinners.map(winner => ({
      ...winner.toObject(),
      phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2')
    }));

    // Get active prizes for display
    const prizes = await Prize.find({ isActive: true }).sort({ position: 1 }).limit(10);

    res.render('public/index', {
      title: 'Online Shopping',
      recentWinners: maskedWinners,
      currentPage: 'home',
      prizes: prizes || []
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.render('public/index', {
      title: 'Online Shopping',
      recentWinners: [],
      currentPage: 'home',
      prizes: []
    });
  }
});

// POST / - Handle phone search from homepage
router.post('/', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.render('public/index', {
        title: 'Online Shopping',
        recentWinners: [],
        currentPage: 'home',
        error: 'Please enter phone number'
      });
    }

    const winner = await Winner.findOne({
      phone: phone,
      isActive: true
    });

    if (!winner) {
      return res.render('public/index', {
        title: 'Online Shopping',
        recentWinners: [],
        currentPage: 'home',
        error: 'No winner found with this phone number'
      });
    }

    // Redirect to status page with winner details
    res.redirect(`/Status?phone=${phone}&found=true`);

  } catch (error) {
    console.error('Phone search error:', error);
    res.render('public/index', {
      title: 'Online Shopping',
      recentWinners: [],
      currentPage: 'home',
      error: 'An error occurred while searching'
    });
  }
});

// GET /Winner-List - Dynamic winner list page
router.get('/Winner-List', async (req, res) => {
  try {
    // Get approved winners for public display
    const winners = await Winner.find({
      isActive: true,
      status: { $in: ['Approved', 'Paid'] }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name phone image wcode createdAt prizeAmount status');

    // Mask phone numbers for privacy
    const maskedWinners = winners.map(winner => ({
      ...winner.toObject(),
      phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2')
    }));

    res.render('public/Winner-List', {
      title: 'Online Shopping',
      winners: maskedWinners,
      currentPage: 'winners'
    });
  } catch (error) {
    console.error('Error loading winner list:', error);
    res.render('public/Winner-List', {
      title: 'Online Shopping',
      winners: [],
      currentPage: 'winners'
    });
  }
});

// GET /Products - Products page with dynamic data
router.get('/Products', async (req, res) => {
  try {
    // You can add dynamic product data here from database if needed
    res.render('public/Products', {
      title: 'Products - Online Shopping',
      currentPage: 'products'
    });
  } catch (error) {
    console.error('Products page error:', error);
    res.render('public/Products', {
      title: 'Products - Online Shopping',
      currentPage: 'products'
    });
  }
});

// GET /Prize - Prize page
router.get('/Prize', (req, res) => {
  res.render('public/Prize', {
    title: 'Online Shopping',
    currentPage: 'prize'
  });
});

// GET /How-to-Win - How to Win page
router.get('/How-to-Win', (req, res) => {
  res.render('public/How-to-Win', {
    title: 'Online Shopping',
    currentPage: 'how-to-win'
  });
});

// GET /Status - Status check page
router.get('/Status', async (req, res) => {
  try {
    const { phone, found } = req.query;
    let winner = null;
    let success = null;

    // If coming from homepage search
    if (phone && found === 'true') {
      winner = await Winner.findOne({
        phone: phone,
        isActive: true
      });

      if (winner) {
        success = 'Winner details found successfully!';
      }
    }

    res.render('public/Status', {
      title: 'Online Shopping',
      currentPage: 'status',
      winner: winner,
      success: success,
      searchPhone: phone || ''
    });
  } catch (error) {
    console.error('Status page error:', error);
    res.render('public/Status', {
      title: 'Online Shopping',
      currentPage: 'status'
    });
  }
});

// POST /Status - Handle status check
router.post('/Status', async (req, res) => {
  try {
    const { phone, wcode } = req.body;

    if (!phone || !wcode) {
      return res.render('public/Status', {
        title: 'Online Shopping',
        currentPage: 'status',
        error: 'Please enter both phone number and W-Code'
      });
    }

    const winner = await Winner.findOne({
      phone: phone,
      wcode: wcode,
      isActive: true
    });

    // if (!winner) {
    //   return res.render('public/Status', {
    //     title: 'Online Shopping',
    //     currentPage: 'status',
    //     error: 'No winner found with the provided details'
    //   });
    // }

    res.render('public/Status', {
      title: 'Online Shopping',
      currentPage: 'status',
      winner: winner,
      success: 'Winner details found successfully!'
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.render('public/Status', {
      title: 'Online Shopping',
      currentPage: 'status',
      error: 'An error occurred while checking status'
    });
  }
});

// GET /Terms - Terms and Conditions page
router.get('/Terms', (req, res) => {
  res.render('public/Terms', {
    title: 'Online Shopping',
    currentPage: 'terms'
  });
});

// GET /Contact - Contact page
router.get('/Contact', (req, res) => {
  res.render('public/Contact', {
    title: 'Online Shopping',
    currentPage: 'contact'
  });
});

// GET /index-2 - Alternative home page
router.get('/index-2', (req, res) => {
  res.sendFile(path.join(__dirname, '../index-2.html'));
});

// GET /search-result - Dynamic search results page
router.get('/search-result', async (req, res) => {
  try {
    const { q, type } = req.query;
    let winners = [];
    let searchQuery = q || '';
    let error = null;

    // Get company bank details for display
    const companyBankDetails = await CompanyBankDetails.getPrimary() ||
      await CompanyBankDetails.findOne({ isActive: true, purpose: 'Prize Distribution' });

    if (searchQuery && type === 'phone') {
      // Search for winners by phone number - include all statuses
      winners = await Winner.find({
        phone: { $regex: searchQuery, $options: 'i' },
        isActive: true
        // Removed status filter to show all winners regardless of status
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('name phone image wcode createdAt prizeAmount address status paid product');

      // Mask phone numbers for privacy
      winners = winners.map(winner => ({
        ...winner.toObject(),
        phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2'),
        formattedDate: new Date(winner.createdAt).toLocaleDateString('en-IN')
      }));

      if (winners.length === 0 && searchQuery) {
        error = `No winners found for phone number: ${searchQuery}`;
      }
    }

    res.render('public/search-result', {
      title: 'Search Results - Online Shopping',
      winners: winners,
      searchQuery: searchQuery,
      searchType: type || 'phone',
      error: error,
      currentPage: 'search',
      companyBankDetails: companyBankDetails ? companyBankDetails.toFrontendFormat() : null
    });
  } catch (error) {
    console.error('Search result error:', error);
    res.render('public/search-result', {
      title: 'Search Results - Online Shopping',
      winners: [],
      searchQuery: q || '',
      searchType: 'phone',
      error: 'An error occurred while searching',
      currentPage: 'search',
      companyBankDetails: null
    });
  }
});

// GET /prize-details - Prize details page
router.get('/prize-details', (req, res) => {
  res.sendFile(path.join(__dirname, '../prize-details.html'));
});

// GET /winner-cash - Winner cash page
router.get('/winner-cash', (req, res) => {
  try {
    res.render('public/winner-cash', {
      title: 'Winner Cash - Online Shopping',
      currentPage: 'winner-cash'
    });
  } catch (error) {
    console.error('Winner cash page error:', error);
    res.status(500).send('Error loading page');
  }
});

// GET /car-processing - Car processing page
router.get('/car-processing', (req, res) => {
  try {
    res.render('public/car-processing', {
      title: 'Car Processing - Online Shopping',
      currentPage: 'car-processing'
    });
  } catch (error) {
    console.error('Car processing page error:', error);
    res.status(500).send('Error loading page');
  }
});

// POST /check-status - Check winner status by phone or W-Code
router.post('/check-status', async (req, res) => {
  try {
    const { phone, wcode } = req.body;
    
    if (!phone && !wcode) {
      return res.json({ 
        success: false, 
        message: 'Please provide either phone number or W-Code' 
      });
    }
    
    let query = { isActive: true };
    
    if (phone) {
      query.phone = phone;
    } else if (wcode) {
      query.wcode = wcode;
    }
    
    const winner = await Winner.findOne(query);
    
    if (!winner) {
      return res.json({ 
        success: false, 
        message: 'No winner found with the provided information' 
      });
    }
    
    // Return limited information for privacy
    res.json({
      success: true,
      winner: {
        name: winner.name,
        wcode: winner.wcode,
        status: winner.status,
        prizeAmount: winner.prizeAmount,
        product: winner.product,
        date: winner.date
      }
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ 
      success: false, 
      message: 'An error occurred while checking status' 
    });
  }
});

// GET /winner-details/:wcode - Get specific winner details
router.get('/winner-details/:wcode', async (req, res) => {
  try {
    const winner = await Winner.findOne({
      wcode: req.params.wcode,
      isActive: true,
      status: 'Approved'
    });

    if (!winner) {
      return res.status(404).json({
        success: false,
        message: 'Winner not found'
      });
    }

    // Return public information only
    res.json({
      success: true,
      winner: {
        name: winner.name,
        wcode: winner.wcode,
        prizeAmount: winner.prizeAmount,
        product: winner.product,
        date: winner.date,
        paid: winner.paid,
        image: winner.image
      }
    });

  } catch (error) {
    console.error('Winner details error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching winner details'
    });
  }
});

// POST /search-winners - Search winners (for search-result page)
router.post('/search-winners', async (req, res) => {
  try {
    const { query, searchType } = req.body;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: false,
        message: 'Please enter at least 2 characters to search'
      });
    }

    let searchQuery = {
      isActive: true,
      status: 'Approved'
    };

    // Build search based on type
    if (searchType === 'phone') {
      searchQuery.phone = { $regex: query.trim(), $options: 'i' };
    } else if (searchType === 'wcode') {
      searchQuery.wcode = { $regex: query.trim(), $options: 'i' };
    } else if (searchType === 'name') {
      searchQuery.name = { $regex: query.trim(), $options: 'i' };
    } else {
      // Search all fields
      searchQuery.$or = [
        { name: { $regex: query.trim(), $options: 'i' } },
        { phone: { $regex: query.trim(), $options: 'i' } },
        { wcode: { $regex: query.trim(), $options: 'i' } }
      ];
    }

    const winners = await Winner.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('name phone wcode prizeAmount product date image createdAt');

    // Mask phone numbers for privacy
    const maskedWinners = winners.map(winner => ({
      ...winner.toObject(),
      phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2')
    }));

    res.json({
      success: true,
      winners: maskedWinners,
      count: winners.length,
      query: query.trim()
    });

  } catch (error) {
    console.error('Search winners error:', error);
    res.json({
      success: false,
      message: 'An error occurred while searching winners'
    });
  }
});

// GET /search-winners - GET version for direct URL access
router.get('/search-winners', async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: false,
        message: 'Please enter at least 2 characters to search',
        winners: []
      });
    }

    let searchQuery = {
      isActive: true,
      status: 'Approved'
    };

    // Build search based on type
    if (type === 'phone') {
      searchQuery.phone = { $regex: q.trim(), $options: 'i' };
    } else if (type === 'wcode') {
      searchQuery.wcode = { $regex: q.trim(), $options: 'i' };
    } else if (type === 'name') {
      searchQuery.name = { $regex: q.trim(), $options: 'i' };
    } else {
      // Search all fields
      searchQuery.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { phone: { $regex: q.trim(), $options: 'i' } },
        { wcode: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    const winners = await Winner.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('name phone wcode prizeAmount product date image createdAt paid');

    // Mask phone numbers for privacy
    const maskedWinners = winners.map(winner => ({
      ...winner.toObject(),
      phone: winner.phone.replace(/(\d{2})\d+(\d{2})/, '$1XXXXXX$2')
    }));

    res.json({
      success: true,
      winners: maskedWinners,
      count: winners.length,
      query: q.trim()
    });

  } catch (error) {
    console.error('Search winners error:', error);
    res.json({
      success: false,
      message: 'An error occurred while searching winners',
      winners: []
    });
  }
});

// Debug route to check database content
router.get('/debug-winners', async (req, res) => {
  try {
    const allWinners = await Winner.find({}).limit(10);
    const phoneSearch = await Winner.find({ phone: '1111111111' });

    res.json({
      totalWinners: await Winner.countDocuments({}),
      allWinners: allWinners,
      phoneSearchResult: phoneSearch,
      searchQuery: '1111111111'
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

module.exports = router;
