# campn

Example review site for campgrounds that includes nodejs, express, passport, and bootstrap. CampN uses nodemailer to send a confirmation email, and for password reset. Until receiving confirmation of the email, the user cannot perform editing actions on the website and a notice appears in the Navbar.

Secrets and individual customization is done through environment variables (see app.js and routes/index.js for use).

You will need to set up a few environment variables for this to work:

- CAMPSDB - mongo db connection url
- PORT - Set it if you do not want the default to be 3000
- NODE_ENV - This defaults to a production assumption and will not reseed the database. Set it to 'development' if you want to seed the DB. Note that setting it to 'devlepment' will drop all campgrounds, comments, and the user beaner. It will then add three campgrounds with three comments and the user beaner.
- AUTHSECRET - This is the secret for express session
- CAMPEMAILUSER - Username for a Gmail account (password resets)
- CAMPMAILPWD - Password for the Gmail account (password resets)
