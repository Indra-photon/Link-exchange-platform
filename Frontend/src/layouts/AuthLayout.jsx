import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Protected({ children, authentication = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const authStatus = useSelector((state) => state.auth.status);

  // Add this function to check for special routes
  const isSpecialRoute = (path) => {
    const specialRoutes = [
      '/subscription-payment',
      '/payment-confirmation',
      '/profile',
    ];

    return specialRoutes.some((route) => path.startsWith(route));
  };

  // Add this function to check if it's a verification page with token
  const isVerificationPage = () => {
    return (
      location.pathname.includes('/verify-email') &&
      location.search.includes('token=')
    );
  };

  useEffect(() => {
    // console.log("Protected component checking auth:", {
    //     authentication,
    //     authStatus,
    //     path: location.pathname,
    //     isSpecial: isSpecialRoute(location.pathname),
    //     isVerification: isVerificationPage()
    // });

    // Skip any redirections for verification pages with tokens
    if (isVerificationPage()) {
      // console.log("Email verification page with token detected, no redirections");
      setIsAuthChecked(true);
      return;
    }

    // Skip any redirections for special routes
    if (isSpecialRoute(location.pathname)) {
      // console.log("Special route detected, no redirections");
      setIsAuthChecked(true);
      return;
    }

    // For protected routes: If authentication required but user not authenticated
    if (authentication && !authStatus) {
      // console.log("Not authenticated, redirecting to login");
      // Redirect to login page, storing the intended destination
      navigate('/login', {
        state: { from: location.pathname },
        replace: true,
      });
    }
    // For public-only routes: If no authentication required but user is authenticated
    else if (!authentication && authStatus) {
      // console.log("Already authenticated on public route, redirecting to work area");
      // Redirect to dashboard
      navigate('/work-area', { replace: true });
    }

    // Mark auth check as complete
    setIsAuthChecked(true);
  }, [authStatus, navigate, authentication, location]);

  // Don't render children until auth check is complete
  if (!isAuthChecked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Skip further checks for verification page with token
  if (isVerificationPage()) {
    return <>{children}</>;
  }

  // Skip further checks for special routes
  if (isSpecialRoute(location.pathname)) {
    return <>{children}</>;
  }

  // For protected routes: only render if authenticated
  if (authentication && !authStatus) {
    return null; // Don't render anything while redirecting
  }

  // For public-only routes: only render if not authenticated
  if (!authentication && authStatus) {
    return null; // Don't render anything while redirecting
  }

  // Auth check passed, render children
  return <>{children}</>;
}
