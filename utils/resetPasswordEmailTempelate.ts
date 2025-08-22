export const resetPasswordEmailTemplate = (verificationLink: string) => {
  return `
    <html>
      <head>
        <style>
          /* General styles */
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
          }
            
          a {
            color: #fff !important
          }

  
          .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 30px;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
  
          h1 {
            color: #333333;
            font-size: 24px;
            text-align: center;
            margin-bottom: 20px;
          }
  
          p {
            color: #666666;
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
          }
  
          /* Button style */
          .button {
            display: block;
            padding: 12px 30px;
            background-color: #636AE8;
            color: #ffffff;
            font-size: 16px;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            transition: background-color 0.3s ease;
          }

          .button:hover {
            background-color: #161D96;
          }

          /* Expiry time text */
          .expire-time {
            font-size: 14px;
            color: #999999;
            text-align: center;
            margin-top: 20px;
          }

          /* Mobile responsiveness */
          @media (max-width: 600px) {
            .container {
              padding: 20px;
            }

            h1 {
              font-size: 20px;
            }

            .button {
              padding: 10px 25px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>
            You requested a password reset. Click the link below:
          </p>
          <a href="${verificationLink}" class="button">Reset Password</a>
          <p class="expire-time">This link will expire in 30 minutes.</p>
        </div>
      </body>
    </html>
  `;
};
