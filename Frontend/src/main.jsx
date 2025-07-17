import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store.js';
import Home from './pages/Home.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import LogIn from './commons/LogIn.jsx';
import SignUp from './commons/SignUp.jsx';
import Profile from './pages/Profile.jsx';
import VerifyEmail from './components/VerifyEmail.jsx';
import SubscriptionPayment from './components/SubscriptionPayment.jsx';
import PaymentConfirmation from './components/PaymentConfirmation.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/profile',
        element: (
          <AuthLayout authentication={true}>
            <Profile />
          </AuthLayout>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <AuthLayout authentication={false}>
            <ForgotPassword />
          </AuthLayout>
        ),
      },
      {
        path: '/subscription-payment',
        element: (
          <AuthLayout authentication={false}>
            <SubscriptionPayment />
          </AuthLayout>
        ),
      },
      {
        path: '/payment-confirmation',
        element: (
          <AuthLayout authentication={true}>
            <PaymentConfirmation />
          </AuthLayout>
        ),
      },
      {
        path: '/verify-email',
        element: (
          <AuthLayout authentication={false}>
            <VerifyEmail />
          </AuthLayout>
        ),
      },
      {
        path: '/login',
        element: (
          <AuthLayout authentication={false}>
            <LogIn />
          </AuthLayout>
        ),
      },
      {
        path: '/signup',
        element: (
          <AuthLayout authentication={false}>
            <SignUp />
          </AuthLayout>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
