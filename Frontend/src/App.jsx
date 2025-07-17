// import Navbar from './commons/Navbar';
// import { useNavigate, Outlet } from 'react-router-dom';
// import { login, logout } from './store/authSlice.js';
// import { useDispatch, useSelector } from 'react-redux';
// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import SessionExpireAlert from './session/SessionExpireAlert';
// import { SpeedInsights } from '@vercel/speed-insights/react';
// import { Toaster } from 'react-hot-toast';
// import { safeApiCall } from './utils/errorHandler.js';

// function App() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [authChecking, setAuthChecking] = useState(true);
//   const authStatus = useSelector((state) => state.auth.status);

//   const checkAuthStatus = async () => {
//     try {
//       // Use safeApiCall for consistent error handling
//       const userResponse = await safeApiCall(
//         () =>
//           axios.get(`${import.meta.env.VITE_BACKEND_DOMAIN}/api/v1/users/me`, {
//             withCredentials: true,
//           }),
//         // Custom error handler for auth check
//         async (error) => {
//           // For auth check, we don't want to show error toasts
//           // Just silently handle auth failures
//           if (
//             error.response?.status === 401 ||
//             error.response?.status === 403
//           ) {
//             // console.log("User not authenticated or unauthorized");
//             dispatch(logout());
//             return true; // Mark as handled - no toast needed
//           }
//           return false; // Let default error handler show toast for other errors
//         }
//       );

//       if (userResponse.data && userResponse.data.data) {
//         const { user, tokenInfo } = userResponse.data.data;
//         // console.log("User authenticated:", user);
//         // console.log("Token info from server:", tokenInfo);

//         // User is authenticated - dispatch with token info from server
//         dispatch(
//           login({
//             user,
//             accessTokenExpiry: tokenInfo?.accessTokenExpiry,
//             refreshTokenExpiry: tokenInfo?.refreshTokenExpiry,
//             loginTime: user.lastLoginDate,
//           })
//         );

//         // Check if token is about to expire
//         if (tokenInfo?.accessTokenExpiry) {
//           const expiryTime = new Date(tokenInfo.accessTokenExpiry).getTime();
//           const currentTime = new Date().getTime();
//           const timeUntilExpiry = expiryTime - currentTime;

//           console.log(
//             'Time until token expiry:',
//             timeUntilExpiry / 1000 / 60,
//             'minutes'
//           );
//         }

//         return true;
//       } else {
//         // console.log("Auth response without user data:", userResponse.data);
//         dispatch(logout());
//         return false;
//       }
//     } catch (error) {
//       // Error already handled by safeApiCall and custom handler
//       console.error('Auth check failed:', error);
//       dispatch(logout());
//       return false;
//     }
//   };

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         await checkAuthStatus();
//       } catch (error) {
//         console.error('Auth check completely failed:', error);
//         dispatch(logout());
//       } finally {
//         setAuthChecking(false);
//       }
//     };

//     fetchUser();
//   }, [dispatch]);

//   // Show loading state only briefly while checking authentication
//   if (authChecking) {
//     // Set a timeout to stop showing loading after 2 seconds even if auth check is still pending
//     setTimeout(() => {
//       setAuthChecking(false);
//     }, 2000);

//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 4000,
//           style: {
//             background: '#363636',
//             color: '#fff',
//           },
//           success: {
//             duration: 3000,
//             style: {
//               background: '#4ade80',
//               color: '#fff',
//             },
//           },
//           error: {
//             duration: 4000,
//             style: {
//               background: '#ef4444',
//               color: '#fff',
//             },
//           },
//         }}
//       />
//       <Navbar />

//       {/* Add SessionExpireAlert component when user is authenticated */}
//       {authStatus && <SessionExpireAlert />}

//       <main>
//         <Outlet />
//       </main>

//       <SpeedInsights />
//     </>
//   );
// }

// export default App;


import { useNavigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import Navbar from './commons/Navbar';
import SessionExpireAlert from './session/SessionExpireAlert';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Toaster } from 'react-hot-toast';
import authService from './api/authService';

function App() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const authStatus = useSelector((state) => state.auth.status);

  // Initialize auth state by verifying with server
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Let authService handle token reading from Redux/localStorage
        // and verify current auth status with server
        await authService.getCurrentUser();
        
        console.log('Authentication verified with server');
      } catch (error) {
        console.log('No valid authentication found or server verification failed');
        // authService and errorHandler will manage any necessary cleanup
        // No need to manually clear storage - let the centralized system handle it
      } finally {
        setAuthChecking(false);
      }
    };

    initializeAuth();
  }, []);

  // Show loading state while checking authentication
  if (authChecking) {
    // Set a maximum timeout for auth checking
    setTimeout(() => {
      if (authChecking) {
        setAuthChecking(false);
      }
    }, 3000); // 3 second maximum loading time

    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#4ade80',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />

      {/* Navigation */}
      <Navbar />

      {/* Session expire alert - only show when authenticated */}
      {authStatus && <SessionExpireAlert />}

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Analytics */}
      <SpeedInsights />
    </>
  );
}

export default App;