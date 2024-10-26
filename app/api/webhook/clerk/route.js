import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.action';
import { clerkClient } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/database';

export async function POST(req) {
  // Connect to the database
  console.log('Connecting to the database...');
  await connectToDatabase();
  console.log('Database connected.');

  // Retrieve the webhook secret
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET is missing');
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Log the headers
  console.log('Received headers:', {
    svix_id,
    svix_timestamp,
    svix_signature,
  });

  // If there are no headers, log the error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers.");
    return new Response('Missing headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  console.log(payload)
  const body = JSON.stringify(payload);
  console.log('Received body:', body);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  // Verify the payload with the headers
  try {
    console.log('Verifying webhook...');
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
    console.log('Verified Event:', evt);
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', { status: 400 });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;
  console.log('Event Type:', eventType);

  if (eventType === 'user.created') {
    const { email_addresses, image_url, first_name, last_name, username } = evt.data;

    const user = {
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username || '',
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    };

    console.log('Creating new user:', user);
    const newUser = await createUser(user);

    if (newUser) {
      console.log('User created successfully:', newUser);
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });
      console.log('User metadata updated in Clerk.');
    }

    return NextResponse.json({ message: 'OK', user: newUser });
  }

  if (eventType === 'user.updated') {
    const { image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name,
      lastName: last_name,
      username: username || '',
      photo: image_url,
    };

    console.log('Updating user:', { clerkId: id, user });
    const updatedUser = await updateUser(id, user);
    console.log('User updated successfully:', updatedUser);

    return NextResponse.json({ message: 'OK', user: updatedUser });
  }

  if (eventType === 'user.deleted') {
    console.log('Deleting user with ID:', id);
    const deletedUser = await deleteUser(id);
    console.log('User deleted successfully:', deletedUser);

    return NextResponse.json({ message: 'OK', user: deletedUser });
  }

  return new Response('Unhandled event type', { status: 400 });
}
