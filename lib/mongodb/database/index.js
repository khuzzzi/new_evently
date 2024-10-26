import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose || { conn: null, promise: null };

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing');

  cached.promise = cached.promise || mongoose.connect(MONGODB_URI, {
    dbName: 'evently',
    bufferCommands: false,
  }).catch(err => {
    console.error('MongoDB connection error:', err);
    throw err; // Re-throw the error to handle it upstream
  });

  cached.conn = await cached.promise;
  console.log('MongoDB connected:', cached.conn.connection.name); // Log successful connection

  return cached.conn;
};
