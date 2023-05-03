const request = require('request');
const cheerio = require('cheerio');
const geolib = require('geolib');
const geocoder = require('geocoder');
const csvWriter = require('csv-write-stream');
const pandas = require('pandas')
const nodemailer = require('nodemailer')
const moment = require('moment')
const fs = require('fs');

const baseURL = 'https://www.mca.gov.in/content/mca/global/en/home.html';
// Function to send HTTP requests and retrieve responses
const sendRequest = (url, callback) => {
  request(url, (error, response, body)=> {
    if (error) {
      return callback(error, null);
    }
    if (response.statusCode !== 200) {
      return callback(new Error('Failed to load page, status code: ' + response.statusCode), null);
    }
    return callback(null, body);
  });
  };

// Function to extract company details from HTML page
const extractDetails = (class1) => {
  const $ = cheerio.load(class1);
  const tableRows = $('table[cellpadding="3"] tr');

  const companyDetails = [];

  tableRows.each((index, element) => {
    if (index === 0) {
      return; // skip header row
    }

    const rowColumns = $(element).find('td');

    const companyName = rowColumns.eq(1).text().trim();
    const directorName = rowColumns.eq(2).text().trim();
    const phone = rowColumns.eq(3).text().trim();
    const email = rowColumns.eq(4).text().trim();
    const address = rowColumns.eq(5).text().trim();

    companyDetails.push({ companyName, directorName, phone, email, address });
  });

  return companyDetails;
};

// Function to geocode company addresses and calculate distance from Raipur
const geocodeAddresses = (companyDetails, callback) => {
  const geocodedDetails = [];

  companyDetails.forEach((detail) => {
    geocoder.geocode(detail.address, (err, data) => {
      if (err) {
        return callback(err, null);
      }

      const { lat, lng } = data.results[0].geometry.location;
      const distance = geolib.getDistance(
        { latitude: lat, longitude: lng },
        { latitude: 21.251384, longitude: 81.629641 } // Raipur coordinates
      );

      geocodedDetails.push({ ...detail, latitude: lat, longitude: lng, distance });
    });
  });

  return callback(null, geocodedDetails);
};

// Function to write company details to a CSV file
const writeDetailsToCSV = (companyDetails, callback) => {
  const writer = csvWriter();
  writer.pipe(fs.createWriteStream('company_details.csv', { flags: 'a' }));

  companyDetails.forEach((detail) => {
    writer.write({
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      companyName: detail.companyName,
      directorName: detail.directorName,
      phone: detail.phone,
      email: detail.email,
      address: detail.address,
      latitude: detail.latitude,
      longitude: detail.longitude,
      distance: detail.distance
    });
  });

  writer.end();

  return callback(null, 'Company details written to CSV file');
};
// Set up cron job to run script daily at 9am
const cron = require('node-cron');
  cron.schedule('0 9 * * *', () => {
  console.log('Running script')
  });

// create an SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-password'
  }
});

// read the extracted data from a file
const data = fs.readFileSync('data.csv', 'utf-8');

// send an email with the extracted data
transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'recipient-email@example.com',
  subject: 'Newly Registered Companies',
  text: 'Attached is the list of newly registered companies:',
  attachments: [
    {
      filename: 'data.csv',
      content: data
    }
  ]
}, (error, info) => {
  if (error) {
    console.error(error);
  } else {
    console.log('Email sent:', info.response);
  }
});


// Function to remove duplicate company details based on a specified key
const removeDuplicates = (companyDetails, key) => {
  const uniqueDetails = [];

  companyDetails.forEach((detail) => {
    const exists = uniqueDetails.some((unique) => unique[key] === detail[key]);
    if (!exists) {
      uniqueDetails.push(detail);
    }
  });
};