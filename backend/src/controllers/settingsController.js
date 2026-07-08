const Settings = require('../models/Settings');

// @desc    Get restaurant settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Fallback if seed failed or was deleted
      settings = await Settings.create({
        restaurantName: 'Kings Family Restaurant',
        address: 'NH7 Bypass Road, near HP Petrol Pump, Agalagurki, Chikkaballapur',
        phoneNumber: '0000000000',
        receiptFooter: 'Thank you for your visit!',
        printerSettings: {
          paperWidth: '80mm',
          printerType: 'browser',
        },
      });
    }
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update restaurant settings
// @route   PUT /api/settings
// @access  Private/Owner
const updateSettings = async (req, res, next) => {
  try {
    const { restaurantName, address, phoneNumber, logoUrl, receiptFooter, printerSettings } = req.body;
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    settings.restaurantName = restaurantName || settings.restaurantName;
    settings.address = address || settings.address;
    settings.phoneNumber = phoneNumber || settings.phoneNumber;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (receiptFooter !== undefined) settings.receiptFooter = receiptFooter;
    
    if (printerSettings) {
      settings.printerSettings = {
        paperWidth: printerSettings.paperWidth || settings.printerSettings.paperWidth,
        printerType: printerSettings.printerType || settings.printerSettings.printerType,
      };
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
