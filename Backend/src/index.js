import { app } from "./app.js";
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config()

const PORT = process.env.PORT || 5174
// Use different URLs for development vs production
const RENDER_URL = process.env.NODE_ENV === 'production' 
    ? "https://story-book-generation-new-2.onrender.com"
    : `http://localhost:${PORT}`;

console.log(`Using RENDER_URL: ${RENDER_URL}`);


// Self-ping function to keep server alive
const keepAlive = () => {
    const url = `${RENDER_URL}/api/v1/ping`;
    
    fetch(url)
        .then(response => {
            if (response.ok) {
                console.log(`✅ Keep-alive ping successful at ${new Date().toISOString()}`);
            } else {
                console.log(`⚠️ Keep-alive ping failed with status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(`❌ Keep-alive ping error: ${error.message}`);
        });
};

connectDB().then(()=>{
    app.listen(PORT, (req,res)=>{
        console.log(`server is running on ${PORT}`);
        
        // Start the keep-alive pinger after server starts
        console.log("🚀 Starting keep-alive pinger...");
        
        // Ping immediately after startup
        setTimeout(keepAlive, 45000); // Wait 30 seconds after startup
        
        // Then ping every 5 minutes (300000 ms)
        setInterval(keepAlive, 10 * 60 * 1000);
    })
}).catch((err)=>{
    console.log("MongoDB connection error", err);
})