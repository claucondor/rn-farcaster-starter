// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "https://esm.sh/v135/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts"


import {
  NeynarAPIClient,
} from "npm:@neynar/nodejs-sdk@1.28.0";


const NEYNAR_API_KEY = Deno.env.get("NEYNAR_API_KEY");

const client = new NeynarAPIClient(NEYNAR_API_KEY!);

interface UserProfile {
  fid: number;
  custodyAddress: string;
  username: string;
  displayName: string;
  pfp: {
    url: string;
  };
  profile: {
    bio: unknown; 
  };
  followerCount: number;
  followingCount: number;
  verifications: string[];
  activeStatus: string;
  timestamp: string;
}

async function fetchFollowersAndFollowing(fid: number): Promise<[UserProfile[], UserProfile[]]> {
  let cursor = "";
  let followers: UserProfile[] = [];
  let following: UserProfile[] = [];

  do {
    const followersResult = await client.fetchUserFollowers(fid, { limit: 150, cursor });
    followers = followers.concat(followersResult.result.users);
    cursor = followersResult.result.next.cursor ?? "";
    } while (cursor !== "" && cursor !== null);

  cursor = ""; 

  do {
    const followingResult = await client.fetchUserFollowing(fid, { limit: 150, cursor });
    following = following.concat(followingResult.result.users);
    cursor = followingResult.result.next.cursor ?? "";
    } while (cursor !== "" && cursor !== null);

  return [followers, following];
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const fids = url.searchParams.getAll("fid");

    if (fids.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Se requieren exactamente dos fids" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const [fid1, fid2] = fids.map(fid => parseInt(fid, 10));

    const [followers1, following1] = await fetchFollowersAndFollowing(fid1);
    const [followers2, following2] = await fetchFollowersAndFollowing(fid2);

    const followersInCommon = followers1.filter(follower1 => followers2.some(follower2 => follower2.fid === follower1.fid)).length;
    const followingInCommon = following1.filter(following1 => following2.some(following2 => following2.fid === following1.fid)).length;

    const totalUniqueFollowers = new Set([...followers1, ...followers2]).size;
    const totalUniqueFollowing = new Set([...following1, ...following2]).size;

    const totalInCommon = followersInCommon + followingInCommon;
    const totalUnique = totalUniqueFollowers + totalUniqueFollowing;

    const socialDistance = totalUnique > 0 ? totalInCommon / totalUnique : 1;
// Log only useful values
console.log(`Total de seguidores únicos: ${totalUniqueFollowers}`);
console.log(`Total de seguidos únicos: ${totalUniqueFollowing}`);
console.log(`Seguidores en común: ${followersInCommon}`);
console.log(`Seguidos en común: ${followingInCommon}`);
console.log(`Distancia social: ${socialDistance}`);

// Print a random follower from each list to verify the format
const randomFollower1 = followers1[Math.floor(Math.random() * followers1.length)];
const randomFollower2 = followers2[Math.floor(Math.random() * followers2.length)];
console.log(`Ejemplo de seguidor de fid1: ${JSON.stringify(randomFollower1)}`);
console.log(`Ejemplo de seguidor de fid2: ${JSON.stringify(randomFollower2)}`);
    return new Response(
      JSON.stringify({ socialDistance }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    if (error.isAxiosError) {
      return new Response(
        JSON.stringify({ error }),
        {
          status: error.response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }
});
