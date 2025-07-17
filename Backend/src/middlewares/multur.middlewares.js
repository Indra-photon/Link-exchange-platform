import multer from 'multer'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null,  "./public/temp")
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
  })
  
  export const upload = multer({ 
    storage
})

const pdfStorage = multer.memoryStorage()
export const pdfUpload = multer({ 
  storage: pdfStorage,
  limits: {
    fileSize: 40 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed!'), false)
    }
  }
})