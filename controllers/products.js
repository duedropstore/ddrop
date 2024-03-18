const stripe = require('stripe')(process.env.STRIPE_KEY)
const { UserBindingPage } = require('twilio/lib/rest/chat/v2/service/user/userBinding');
const accountSid = process.env.TW_ID;
const authToken = process.env.TW_AUTH;
const client = require('twilio')(accountSid, authToken);
// const async = require("async")
// const nodemailer = require('nodemailer')
// const crypto = require('crypto') 
const { cloudinary } = require("../cloudinary");
const axios = require('axios')
const jsdom = require('jsdom');
const Product = require('../models/product')
const { JSDOM } = jsdom;
const OpenAI = require("openai");
const cheerio = require('cheerio')
const Post = require('../models/product')
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');

module.exports.newProduct = async (req, res) => {
    console.log('new_Product')

    res.render('new_product')
}

// module.exports.renderProducts = async (req, res) => {
//     console.log('renderProducts')
//     const products = await Product.find()
//     const categorizedProducts = {};

//     // Iterate over each product
//     products.forEach(product => {
//         // Assuming each product has only one category for simplicity
//         const category = product.category[0];

//         // Check if the category already exists in the categorizedProducts object
//         if (!categorizedProducts[category]) {
//             // If not, create a new array for this category
//             categorizedProducts[category] = [];
//         }

//         // Add the product to the appropriate category array
//         categorizedProducts[category].push(product);
//     });
//     const post = categorizedProducts['Pantry'][0]
//     res.render('products/render', { categorizedProducts, post })
// }

module.exports.renderProducts = async (req, res) => {
    console.log('renderProducts');
    const products = await Product.find();
    const categorizedProducts = {};

    // Iterate over each product
    products.forEach(product => {
        // Assuming each product has a category and images field
        const category = product.category[0]; // Simplified assumption of one category per product

        // Simplify the product representation for the view
        const productForView = {
            id: product._id,
            title: product.title,
            price: product.price,
            link: product.link, // Assuming there's a link field
            images: product.images[0].url// Map image objects to their URLs
        };

        // Check if the category already exists in the categorizedProducts object
        if (!categorizedProducts[category]) {
            // If not, create a new array for this category
            categorizedProducts[category] = [];
        }

        // Add the simplified product representation to the appropriate category array
        categorizedProducts[category].push(productForView);
    });

    const post = categorizedProducts['Pantry'] ? categorizedProducts['Pantry'][0] : null;
    console.log(categorizedProducts)
    res.render('products/render', { categorizedProducts, post });
};


module.exports.searchBox = async (req, res) => {
    const searchQuery = res.body.query
    await Product.find({
        $text: {
            $search: searchQuery
        }
    }, {
        score: { $meta: 'textScore' }
    }).sort({
        score: { $meta: 'textScore' }
    }).then(products => {
        console.log(products); // Logs the search results
    }).catch(err => {
        console.error(err);
    });
}

module.exports.createProduct = async (req, res) => {
    console.log('createProduct')
    console.log(req.body)
    try {
        const { id } = req.params
        const product = new Product(req.body.product);
        const user = await User.findById(req.user._id);
        product.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        product.author = req.user._id;
        product.category = req.body.category
        product.price = parseInt(req.body.product.price)
        console.log(req.body)
        if (req.body.weighted == "No") {
            product.weighted = false
        } else if (req.body.weighthed == "Si") {
            product.weighted = true
        }
        user.products.push(product);
        const place = await Place.findById(id)
        place.products.push(product)
        product.place = place
        await product.save();
        await place.save();
        await user.save();
        res.redirect('/places')
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/places')
    }
}
// module.exports.scrapePrice = async (req, res) => {
//     // Read the Excel file
//     const workbook = XLSX.readFile('./Central Market All Dept Products.xlsx');

//     // Get the first sheet name
//     const firstSheetName = workbook.SheetNames[0];

//     // Get the worksheet
//     const worksheet = workbook.Sheets[firstSheetName];

//     // Convert the worksheet to JSON
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
//     const error_imgs = [{}]
//     // Print each row
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     // await page.goto('https://www.traderjoes.com/home/products/pdp/thai-lime-chili-cashews-060389', { waitUntil: 'networkidle2' });
//     // const htmlContent = await page.content();
//     // console.log(htmlContent)
//     // const priceRegex = /<span class="ProductPrice_productPrice__price__3-50j">\$(\d+\.\d{2})<\/span>/;

//     // const match = htmlContent.match(priceRegex);
//     // console.log(match)
//     // if (match && match[1]) {
//     //     console.log(`Price: $${match[1]}`);
//     // } else {
//     //     console.log('Price not found');
//     // }
//     // await browser.close();


//     for (const row of jsonData) {
//         if (row[0] !== 'Product Links') {
//             console.log(row[0]);
//             try {
//                 await page.goto(row[0], { waitUntil: 'networkidle2' });
//                 // Wait for the price element to appear in the DOM 
//                 const htmlContent = await page.content();
//                 console.log(htmlContent)
//             } catch (error) {
//                 console.error(`Error navigating to ${row[0]}:`, error.message);
//             }
//         }
//     }

//     await browser.close();
// }


module.exports.scrapePrice = async (req, res) => {
    // Read the Excel file
    const workbook = XLSX.readFile('./Central Market All Dept Products.xlsx');

    // Get the first sheet name
    const firstSheetName = workbook.SheetNames[0];

    // Get the worksheet
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert the worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const browser = await puppeteer.launch({
        headless: true, // Set to false if you want to see the browser
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');

    // Accept cookies if necessary (you might need to adjust the selector based on the website)
    // await page.waitForSelector('selector-for-cookies-accept-button');
    // await page.click('selector-for-cookies-accept-button');

    for (const row of jsonData) {
        if (row[0] !== 'Product Links') {
            console.log(`Navigating to: ${row[0]}`);
            try {
                await page.goto(row[0], { waitUntil: 'networkidle2' });
                // Optionally, wait for a specific element that indicates the page has loaded
                // await page.waitForSelector('your-price-element-selector', { timeout: 5000 });

                const htmlContent = await page.content();
                // Process the page content, e.g., extract price
                console.log(htmlContent);

                // Add a delay between requests to mimic human behavior
                await page.waitForTimeout(1000 + Math.random() * 2000); // Random delay between 1 and 3 seconds
            } catch (error) {
                console.error(`Error navigating to ${row[0]}:`, error.message);
            }
        }
    }

    await browser.close();
};
module.exports.assignVendor = async (req, res) => {
    console.log('assigning_vendor')
    const products = await Product.find()
    for (let product of products) {
        const current = await Product.findById(product.id)
        current.vendor = 'Trader Joes'
        await current.save()
        console.log(current)
    }
    console.log(products)
}

module.exports.populate_db = async (req, res) => {
    console.log('Populating')
    // Read the Excel file
    const workbook = XLSX.readFile('./CentralMarket - 296 (1).xlsx');

    // Get the first sheet name
    const firstSheetName = workbook.SheetNames[0];

    // Get the worksheet
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert the worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    var error_imgs = [{}]

    var errors = 0
    // Print each row
    for (let row of jsonData) {
        // Convert setTimeout into a promise-based function 
        try {
            const product = new Product()
            product.category = row[5]
            product.sub_category = row[6]
            product.link = row[0]
            product.description = row[3]
            product.content = row[7]
            product.vendor = 'Central Market'
            product.price = parseFloat(row[2].replace(/[^0-9.]/g, ''))
            product.title = row[1]

            // Image URL you want to upload
            const imageUrl = row[4];
            // Upload image to Cloudinary
            try {
                results = await cloudinary.uploader.upload(imageUrl, { folder: "images/" })


                // Output the result URL (This is the URL you'll use as the image's URL)
                console.log('Uploaded image URL:', results.url);
                product.images = { url: results.url, filename: row[2] };
                console.log('##############$$$$$$$$$$$$$$$$$$%%%%%%%%%%%%####################################\n', product)
                await product.save();

            } catch (e) {
                errors = errors + 1
                error_imgs.push({ 'id': product.id, 'img_url': imageUrl })
                // console.log(error_imgs)
                console.error('Error uploading to Cloudinary:', e);
                await product.save();

            }
            console.log("########$##########@!$*!@)%$*$TT(#$%(*%^(*##%*(%$(**$%*%*^(^*(6\n", errors)

        } catch (e) {
            console.log(e)
            req.flash('Refresca la Pagina e Intenta de Nuevo')
        }
    }
    // Set a max retry limit to prevent infinite loops
    const uploaded = []
    console.log("########$##########@!$*!@)%$*$TT(#$%(*%^(*##%*(%$(**$%*%*^(^*(6\n", error_imgs)
    while (errors > 0) {

        // console.log(`Retrying failed uploads. Attempt ${retries + 1} of ${maxRetries}`);
        let failedUploads = []; // Temporary array to hold failures in this retry attempt
        for (let i = error_imgs.length - 1; i >= 0; i--) {
            const item = error_imgs[i];
            try {
                console.log(item.id)
                if (!uploaded.includes(item.img_url)) {
                    const result = await cloudinary.uploader.upload(item.img_url, { folder: "images/", timeout: 100000 });
                    console.log('Re-uploaded image URL:', result.url);
                    const now_product = await Product.findById(item.id)
                    now_product.images = { url: result.url, filename: item.img_url };
                    uploaded.push(item.img_url)
                    await now_product.save();
                    errors = errors - 1
                    error_imgs.splice(i, 1);
                    console.log(errors)
                }
            } catch (e) {
                console.error(`Error re-uploading to Cloudinary for product ID ${item}:`, e);
                failedUploads.push(item); // Add to failed uploads if it still fails
            }
        }
        // Increment the retry counter
        error_imgs = failedUploads; // Replace the error_imgs with the ones that failed in this retry attempt
    }

}

module.exports.renderCat = async (req, res) => {
    console.log('renderCat');
    // Retrieve the category from the query parameters
    const queryCategory = req.query.category;
    console.log(req.query.category);

    // Fetch all products then filter by category inclusivity
    const allProducts = await Product.find({});
    const catProducts = [];
    const prods = []

    // Iterate over each fetched product
    allProducts.forEach(product => {
        // Check if any of the categories of the product include the queryCategory
        // Assuming the category field is an array of strings

        if (product.category.some(cat => cat.toLowerCase().includes(queryCategory.toLowerCase()))) {
            prods.push(product)
            // Simplify the product representation for the view
            const productForView = {
                id: product._id,
                title: product.title,
                price: product.price,
                link: product.link, // Assuming there's a link field
                images: product.images[0] ? product.images[0].url.replace("http://", "https://") : '' // Safely handle the potential absence of images
            };

            // Add the simplified product representation to the catProducts array
            catProducts.push(productForView);
        }
    });
    const subCategories = [...new Set(prods.flatMap(product => product.sub_category))];

    // Sort subcategories if needed.
    subCategories.sort();
    console.log(subCategories)

    // Render the view with the filtered, categorized products
    res.render('products/renderCat', { catProducts, queryCategory, subCategories });
};
