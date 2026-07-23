/*
 * Add approved work and client logos here. Nothing in these arrays is a demo:
 * only publish real projects with permission from the relevant rights holders.
 *
 * YouTube placement:
 * {
 *   title: "Campaign title",
 *   brand: "Brand name",
 *   role: "Original music",
 *   type: "youtube",
 *   youtubeId: "VIDEO_ID",
 *   poster: "../assets/sync/campaign-poster.jpg",
 *   alt: "Brief description of the campaign still"
 * }
 *
 * Audio placement:
 * {
 *   title: "Campaign title",
 *   brand: "Brand name",
 *   role: "Music licensing",
 *   type: "audio",
 *   audio: "../assets/sync/campaign-audio.mp3",
 *   poster: "../assets/sync/campaign-artwork.jpg",
 *   alt: "Campaign artwork"
 * }
 *
 * Spotify placement:
 * {
 *   title: "Track title",
 *   brand: "Project or client",
 *   role: "Soundtrack placement",
 *   type: "spotify",
 *   spotifyUrl: "https://open.spotify.com/track/TRACK_ID",
 *   poster: "../assets/sync/project-artwork.jpg",
 *   alt: "Brief description of the artwork"
 * }
 *
 * Campaign placement:
 * {
 *   title: "Campaign title",
 *   brand: "Client name",
 *   role: "Music placement",
 *   type: "campaign",
 *   campaignUrl: "https://www.instagram.com/reel/POST_ID/",
 *   spotifyUrl: "https://open.spotify.com/track/TRACK_ID",
 *   poster: "../assets/sync/campaign-still.jpg",
 *   alt: "Brief description of the campaign still"
 * }
 *
 * DISCO placement:
 * {
 *   title: "Campaign title",
 *   brand: "Client name",
 *   role: "Music placement",
 *   type: "disco",
 *   discoUrl: "https://artist.disco.ac/e/t/TRACK_ID?..."
 * }
 *
 * Client logo:
 * {
 *   name: "Client name",
 *   src: "../assets/sync/logos/client-name.png"
 * }
 */

window.SYNC_CONTENT = {
  placements: [
    {
      title: "Misty Green — Official Trailer",
      brand: "A24",
      role: "Music",
      type: "youtube",
      youtubeId: "ACaWuqeLpSk",
      poster: "../assets/sync/misty-green-a24.jpg",
      alt: "Misty Green official trailer still showing a woman in sunglasses outdoors",
    },
    {
      title: "Adidas x Ninja",
      brand: "adidas",
      role: "Music",
      type: "youtube",
      youtubeId: "tc6JNy5jOMc",
      poster: "../assets/sync/adidas-ninja.jpg",
      alt: "Ninja seated on a train with the adidas logo",
    },
    {
      title: "McVitie’s — There Is Only One",
      brand: "McVitie’s",
      role: "Music",
      type: "youtube",
      youtubeId: "ucXQGNY7ZcQ",
      poster: "../assets/sync/mcvities-there-is-only-one.jpg",
      alt: "McVitie’s There Is Only One advert featuring a man seated in a television studio",
    },
    {
      title: "Shining — FIFA 22 Soundtrack",
      brand: "EA Sports",
      role: "Soundtrack placement",
      type: "spotify",
      spotifyUrl: "https://open.spotify.com/track/5Xhhyt36Ir4zdyVTaJPzWz",
      poster: "../assets/sync/fifa22-soundtrack.png",
      alt: "FIFA 22 soundtrack cover featuring Kylian Mbappé",
    },
    {
      title: "Heat It Up",
      brand: "JD Sports",
      role: "Music placement",
      type: "campaign",
      campaignUrl: "https://www.instagram.com/reels/CqSaTr5Aqdw/",
      spotifyUrl: "https://open.spotify.com/track/6PSSr0OoQj1egFsfm5hTou",
      poster: "../assets/sync/jd-sports-heat-it-up-enhanced.png",
      alt: "JD Sports Heat It Up campaign featuring five models on a rooftop",
    },
    {
      title: "Pepsi — Radio Advertisement",
      brand: "Pepsi",
      role: "Music",
      type: "disco",
      discoUrl: "https://jikay.disco.ac/e/t/209492479?s=v2%3Alegacy%3AhoKry8D-4TWrDpfZm7d9Y0XnJL8OAKuq1jpVokPleL0&artwork=true&color=%23c9b6ff&theme=dark",
    },
  ],
  clients: [
    { name: "A24", src: "../assets/sync/clients/a24.png" },
    { name: "adidas", src: "../assets/sync/clients/adidas.png" },
    { name: "BBC", src: "../assets/sync/clients/bbc.png" },
    { name: "EA Sports", src: "../assets/sync/clients/ea-sports.svg" },
    { name: "IAMS", src: "../assets/sync/clients/iams.png" },
    { name: "McVitie’s", src: "../assets/sync/clients/mcvities.png" },
    { name: "NHL", src: "../assets/sync/clients/nhl.png" },
    { name: "Pepsi", src: "../assets/sync/clients/pepsi.png" },
    { name: "Sky Sports", src: "../assets/sync/clients/sky-sports.png" },
  ],
};
