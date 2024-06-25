#!/bin/bash

# Update package index
sudo apt-get update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx

# Create directories and set permissions
sudo mkdir -p /var/www/coffeeshop
sudo chown -R $USER:$USER /var/www/coffeeshop

# Setup Node.js backend
mkdir ~/coffeeshop-backend
cd ~/coffeeshop-backend

# Initialize Node.js application
npm init -y

# Install dependencies (e.g., express)
npm install express

# Create server.js for Node.js backend
cat << EOF > server.js
const express = require('express');
const app = express();
const port = 3000;

let coffees = [];

app.use(express.json());

app.get('/api/coffees', (req, res) => {
  res.json(coffees);
});

app.post('/api/coffees', (req, res) => {
  const { name, description } = req.body;
  const newCoffee = { id: coffees.length + 1, name, description };
  coffees.push(newCoffee);
  res.json(newCoffee);
});

app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
});
EOF

# Start Node.js application
node server.js &

# Configure Nginx
cat << 'EOF' | sudo tee /etc/nginx/sites-available/coffeeshop
server {
    listen 80;
    server_name localhost;

    root /var/www/coffeeshop;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable Nginx configuration
sudo ln -s /etc/nginx/sites-available/coffeeshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Create index.html for frontend
cat << 'EOF' | sudo tee /var/www/coffeeshop/index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coffee Shop</title>
</head>
<body>
  <h1>Coffee Shop</h1>
  <form id="coffee-form">
    <input type="text" id="name" placeholder="Coffee Name" required>
    <input type="text" id="description" placeholder="Description" required>
    <button type="submit">Add Coffee</button>
  </form>
  <h2>Menu</h2>
  <ul id="coffee-list"></ul>
  <script>
    document.getElementById('coffee-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const description = document.getElementById('description').value;
      const response = await fetch('/api/coffees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });
      const newCoffee = await response.json();
      displayCoffees();
    });

    async function displayCoffees() {
      const response = await fetch('/api/coffees');
      const coffees = await response.json();
      const coffeeList = document.getElementById('coffee-list');
      coffeeList.innerHTML = '';
      coffees.forEach(coffee => {
        const li = document.createElement('li');
        li.textContent = `${coffee.name}: ${coffee.description}`;
        coffeeList.appendChild(li);
      });
    }

    displayCoffees();
  </script>
</body>
</html>
EOF

# Restart Nginx to apply changes
sudo systemctl restart nginx

# Output final setup message
echo "Setup complete! Access your Coffee Shop application at http://localhost"
