require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const fileUpload = require('express-fileupload');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoSelectFamily: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

// Contact Mongoose Schema & Model
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a contact name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other', 'Prefer not to say'],
        message: '{VALUE} is not a valid gender (Male, Female, Other, Prefer not to say)',
      },
      default: 'Prefer not to say',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    profilePic: {
      type: String,
      default: '',
    },
    profilePicPublicId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model('Contact', contactSchema);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express file upload middleware configuration
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: './tmp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // limit to 5MB
  })
);

// Helper to clean up temp files
const cleanTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting temp file ${filePath}:`, err.message);
    }
  }
};


// Simple logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---

// Welcome root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Contact Management REST API. Use /api/contacts for CRUD operations.',
  });
});

// 1. Create a Contact
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, gender, address } = req.body || {};

    if (!name || !email || !phone) {
      if (req.files && req.files.profilePic) {
        cleanTempFile(req.files.profilePic.tempFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone fields',
      });
    }

    // Check if email already exists
    const contactExists = await Contact.findOne({ email });
    if (contactExists) {
      if (req.files && req.files.profilePic) {
        cleanTempFile(req.files.profilePic.tempFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'A contact with this email already exists',
      });
    }

    let profilePic = '';
    let profilePicPublicId = '';

    if (req.files && req.files.profilePic) {
      const file = req.files.profilePic;
      if (!file.mimetype.startsWith('image/')) {
        cleanTempFile(file.tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Please upload an image file',
        });
      }

      try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'contact_profiles',
        });
        profilePic = result.secure_url;
        profilePicPublicId = result.public_id;
      } catch (uploadError) {
        cleanTempFile(file.tempFilePath);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile picture to cloud storage: ' + uploadError.message,
        });
      } finally {
        cleanTempFile(file.tempFilePath);
      }
    }

    const contact = await Contact.create({
      name,
      email,
      phone,
      gender,
      address,
      profilePic,
      profilePicPublicId,
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    if (req.files && req.files.profilePic) {
      cleanTempFile(req.files.profilePic.tempFilePath);
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
});

// 2. Get All Contacts (with optional Search)
app.get('/api/contacts', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
});

// 3. Get Single Contact by ID
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID format',
      });
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
});

// 4. Update a Contact
app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, gender, address } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.files && req.files.profilePic) {
        cleanTempFile(req.files.profilePic.tempFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID format',
      });
    }

    let contact = await Contact.findById(id);
    if (!contact) {
      if (req.files && req.files.profilePic) {
        cleanTempFile(req.files.profilePic.tempFilePath);
      }
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    // Check email uniqueness if email is being updated
    if (email && email.toLowerCase() !== contact.email.toLowerCase()) {
      const emailTaken = await Contact.findOne({ email: email.toLowerCase() });
      if (emailTaken) {
        if (req.files && req.files.profilePic) {
          cleanTempFile(req.files.profilePic.tempFilePath);
        }
        return res.status(400).json({
          success: false,
          message: 'A contact with this email already exists',
        });
      }
    }

    const updateData = { name, email, phone, gender, address };

    if (req.files && req.files.profilePic) {
      const file = req.files.profilePic;
      if (!file.mimetype.startsWith('image/')) {
        cleanTempFile(file.tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Please upload an image file',
        });
      }

      try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'contact_profiles',
        });

        // Delete old profile picture from Cloudinary
        if (contact.profilePicPublicId) {
          try {
            await cloudinary.uploader.destroy(contact.profilePicPublicId);
          } catch (destroyError) {
            console.error('Failed to delete old image from Cloudinary:', destroyError.message);
          }
        }

        updateData.profilePic = result.secure_url;
        updateData.profilePicPublicId = result.public_id;
      } catch (uploadError) {
        cleanTempFile(file.tempFilePath);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile picture to cloud storage: ' + uploadError.message,
        });
      } finally {
        cleanTempFile(file.tempFilePath);
      }
    }

    contact = await Contact.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    if (req.files && req.files.profilePic) {
      cleanTempFile(req.files.profilePic.tempFilePath);
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
});

// 5. Delete a Contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID format',
      });
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    // Delete image from Cloudinary if it exists
    if (contact.profilePicPublicId) {
      try {
        await cloudinary.uploader.destroy(contact.profilePicPublicId);
      } catch (destroyError) {
        console.error('Failed to delete image from Cloudinary on contact delete:', destroyError.message);
      }
    }

    await Contact.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found - ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

let server;

if (require.main === module) {
  // Connect to Database
  connectDB();

  // Listen Server
  server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

module.exports = app;
