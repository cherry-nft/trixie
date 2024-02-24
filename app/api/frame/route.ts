// app > api / frame > route.ts

require('dotenv').config();
import { init } from "@airstack/frames";
import { FrameRequest, getFrameMessage, getFrameHtmlResponse } from '@coinbase/onchainkit';
import { NextRequest, NextResponse } from 'next/server';
import getHyperFrame from '../../api/frame/hyperframes';
import { NEXT_PUBLIC_URL } from '../../config';
import { checkIsFollowingFarcasterUser, CheckIsFollowingFarcasterUserInput, CheckIsFollowingFarcasterUserOutput, } from "@airstack/frames";

const apiKey = process.env.AIRSTACK_API_KEY || '';
init(apiKey);

async function getResponse(req: NextRequest): Promise<NextResponse> {
  let accountAddress: string | undefined = '';
  let text: string | undefined = '';

  const body: FrameRequest = await req.json(); // Extract the body from the POST request

  const { isValid, message } = await getFrameMessage(body, { neynarApiKey: 'NEYNAR_ONCHAIN_KIT' }); // Validate the frame message using OnchainKit

  console.error('Invalid frame message', message);   // Error handling if the frame parameter or button number is missing
  if (!isValid) {
    return new NextResponse('Invalid frame message', { status: 400 });
  }

  const url = new URL(req.url);   // Extract the 'frame' query parameter to identify which frame sent the request
  const queryParams = url.searchParams;
  const frame = queryParams.get('frame');

  // If the 'frame' query parameter is missing, return a 404 response
  if (!frame) {
    return new NextResponse('Frame not found', { status: 404 });
  }

  // There should always be a button number in the message
  if (!message?.button) {
    return new NextResponse('Button not found', { status: 404 });
  }
  
  text = message.input;
  console.log('Received text:', text);

  // If everything is valid, call getHyperFrame to determine the next frame
  return new NextResponse(await getHyperFrame(frame as string, text || '', message?.button));
}

export async function POST(req: NextRequest): Promise<Response> {
    // Extract the body from the POST request
    const body: FrameRequest = await req.json();
    const message = (body as any).message;
  
    // Extract the 'frame' query parameter to identify which frame sent the request
    const url = new URL(req.url);
    const queryParams = url.searchParams;
    const frame = queryParams.get('frame');
  
    if (frame === 'guess') {
      const fid = queryParams.get('fid');
      const followsYou = await isUserFollowing(Number(fid), 5653); 

      if (!followsYou) {
        // User is not following you. Change the frame to prompt them to follow you.
        return new NextResponse(getFrameHtmlResponse({
          buttons: [{ label: 'Follow me to Select Chipotle!' }],
          image: { src: `${NEXT_PUBLIC_URL}/sorry.png`, aspectRatio: '1:1' },
        }));
      } else {
        // User is following you. Proceed to the password input frame.
        return new NextResponse(getPasswordInputFrameHtmlResponse());
      }
    }
  return getResponse(req);
}

function getPasswordInputFrameHtmlResponse(): string {
  // Return the HTML for the password input frame
  return 'guess'
}

async function isUserFollowing(fid: number, followingFid: number): Promise<boolean> {
  const input: CheckIsFollowingFarcasterUserInput = {
      fid: fid,
      isFollowing: [followingFid],
  };
  const { data, error }: CheckIsFollowingFarcasterUserOutput = await checkIsFollowingFarcasterUser(input);

  if (error) {
    throw new Error(error);
  }
  
  // Check if data is not null and has at least one element
  if (data && data.length > 0 && data[0].isFollowing) {
    console.log("The user is following.");
    return true; // The user is following
  } else {
    console.log("The user is not following.");
    return false; // The user is not following
  }
}

export const dynamic = 'force-dynamic';
