# Use the official Node.js image as base
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application (if needed)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["node", "dist/index.js"]
