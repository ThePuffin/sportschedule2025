import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import * as express from 'express';
import { onRequest } from 'firebase-functions/v2/https'; // Import onRequest from v2
import * as logger from 'firebase-functions/logger';
import { AppModule } from './src/app.module';
import { initializeApp } from 'firebase-admin/app'; // Import initializeApp
// index.js (inside the functions directory)
require('dotenv').config();

const port = process?.env?.PORT;

// Create an Express server
const server: express.Express = express();

// Define a function to create a NestJS server within an Express instance
export const createNestServer = async (expressInstance: express.Express) => {
  // Create an ExpressAdapter with the Express instance
  const adapter = new ExpressAdapter(expressInstance);

  // Create a NestJS application using the AppModule and the adapter
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    adapter,
    {},
  );

  // Enable CORS for the application
  app.enableCors();

  // Initialize the application and return it
  return app.init();
};

// Create the NestJS server and log the status
if (process.env.FIREBASE_EMULATOR !== 'true') {
  createNestServer(server)
    .then(() => logger.info('Nest Ready')) // Use logger.info for success
    .catch((err) => logger.error('Nest broken', err)); // Use logger.error for error
  // Initialize Firebase Admin SDK
  initializeApp();
  // Export the Express server as a Firebase cloud function (v2 syntax)
  export const api = onRequest({ cors: true }, server);
} else {
  createNestServer(server);
}
