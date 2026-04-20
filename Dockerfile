# Use Node 24 as the base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the default Vite port
EXPOSE 5173

# Start the development server
# --host 0.0.0.0 is handled inside vite.config.ts but added here for safety
CMD ["npm", "run", "dev", "--", "--host"]
