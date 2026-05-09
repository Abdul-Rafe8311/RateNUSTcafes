const CAFES = [
  {
    id: '1',
    name: 'Concordia 1',
    location: 'Near NBS Ground',
    description: 'Quick bites, great chai, and a chill vibe between classes. The go-to spot when you have 10 minutes between lectures.',
    baseRating: 4.2,
    baseReviews: 124,
    emoji: '☕',
    menu: [
      { cat: 'Sandwiches & Burgers', items: [
        { id: 'c1-sb1',  name: 'Tikka Sandwich (2P)' },
        { id: 'c1-sb2',  name: 'Tikka Sandwich (4P)' },
        { id: 'c1-sb3',  name: 'Tikka Burger' },
        { id: 'c1-sb4',  name: 'Egg Shami Burger' },
        { id: 'c1-sb5',  name: 'Shami Burger' },
        { id: 'c1-sb6',  name: 'Chicken Cheese Burger' },
        { id: 'c1-sb7',  name: 'Grilled Chicken Burger' },
        { id: 'c1-sb8',  name: 'Zinger Burger' },
        { id: 'c1-sb9',  name: 'Chapli Kabab Burger' },
        { id: 'c1-sb10', name: 'Chicken Mayo Sandwich' },
        { id: 'c1-sb11', name: 'Club Sandwich' },
      ]},
      { cat: 'Wraps & Rolls', items: [
        { id: 'c1-wr1', name: 'Chicken Shawarma' },
        { id: 'c1-wr2', name: 'Chicken Cheese Shawarma' },
        { id: 'c1-wr3', name: 'Zinger Roll Paratha' },
        { id: 'c1-wr4', name: 'Zinger Roll Paratha (Cheese)' },
      ]},
      { cat: 'Pizza', items: [
        { id: 'c1-pz1', name: 'Pizza Slice / Small Pizza' },
        { id: 'c1-pz2', name: 'Chicken Tikka Pizza (S/M/L)' },
        { id: 'c1-pz3', name: 'Pizza (Extra Large)' },
        { id: 'c1-pz4', name: 'Pizza (Family)' },
        { id: 'c1-pz5', name: 'Crown Crust (S/M/L)' },
      ]},
    ]
  },
  {
    id: '2',
    name: 'Concordia 2',
    location: 'Near SEECS',
    description: 'Fuel for late-night lab sessions. The favorite of CS and EE students — always packed after 8 pm, somehow still manages fast service.',
    baseRating: 4.5,
    baseReviews: 207,
    emoji: '⚡',
    menu: [
      { cat: 'Roll Paratha', items: [
        { id: 'c2-rp1',  name: 'Chapati Roll Paratha' },
        { id: 'c2-rp2',  name: 'Chicken Roll Paratha' },
        { id: 'c2-rp3',  name: 'Chicken Roll Paratha Spicy' },
        { id: 'c2-rp4',  name: 'Chicken Cheese Roll Paratha' },
        { id: 'c2-rp5',  name: 'Chicken Jambo Roll Paratha' },
        { id: 'c2-rp6',  name: 'Chicken Jambo Cheese Roll Paratha' },
        { id: 'c2-rp7',  name: 'Chicken Malai Boti Roll Paratha' },
        { id: 'c2-rp8',  name: 'Chicken Malai Boti Cheese Roll Paratha' },
        { id: 'c2-rp9',  name: 'Chicken Malai Boti Jambo Roll Paratha' },
        { id: 'c2-rp10', name: 'Chicken Malai Boti Jambo Cheese Roll Paratha' },
        { id: 'c2-rp11', name: 'Chicken Seekh Kabab Roll Paratha' },
        { id: 'c2-rp12', name: 'Chicken Seekh Kabab Cheese Roll Paratha' },
        { id: 'c2-rp13', name: 'Chicken Seekh Kabab Jambo Roll Paratha' },
        { id: 'c2-rp14', name: 'Chicken Seekh Kabab Jambo Cheese Roll Paratha' },
      ]},
      { cat: 'BBQ', items: [
        { id: 'c2-bbq1', name: 'Chicken Tikka Boti (5 Piece)' },
        { id: 'c2-bbq2', name: 'Chicken Tikka Boti (8 Piece)' },
        { id: 'c2-bbq3', name: 'Chicken Tikka Malai Boti (5 Piece)' },
        { id: 'c2-bbq4', name: 'Chicken Tikka Malai Boti (8 Piece)' },
        { id: 'c2-bbq5', name: 'Chicken Seekh Kabab (1 Piece)' },
        { id: 'c2-bbq6', name: 'Chicken Seekh Kabab (4 Piece)' },
        { id: 'c2-bbq7', name: 'Chicken Tikka Chest Piece' },
        { id: 'c2-bbq8', name: 'Chicken Tikka Leg Piece' },
        { id: 'c2-bbq9', name: 'Single Paratha' },
      ]},
      { cat: 'Sandwiches & Burgers', items: [
        { id: 'c2-sb1', name: 'Tikka Burger' },
        { id: 'c2-sb2', name: 'Zinger Burger' },
        { id: 'c2-sb3', name: 'Chicken Cheese Burger' },
        { id: 'c2-sb4', name: 'Grilled Chicken Burger' },
        { id: 'c2-sb5', name: 'Chapli Kabab Burger' },
        { id: 'c2-sb6', name: 'Chicken Mayo Sandwich' },
        { id: 'c2-sb7', name: 'Club Sandwich' },
      ]},
      { cat: 'Pizza', items: [
        { id: 'c2-pz1', name: 'Pizza Slice / Small Pizza' },
        { id: 'c2-pz2', name: 'Chicken Tikka Pizza (S/M/L)' },
        { id: 'c2-pz3', name: 'C2 Special Pizza (S/M/L)' },
        { id: 'c2-pz4', name: 'Pizza (Extra Large)' },
        { id: 'c2-pz5', name: 'Pizza (Family)' },
        { id: 'c2-pz6', name: 'Crown Crust Pizza (S/M/L)' },
      ]},
      { cat: 'Shawarma & Wraps', items: [
        { id: 'c2-wr1', name: 'Chicken Shawarma' },
        { id: 'c2-wr2', name: 'Chicken Cheese Shawarma' },
        { id: 'c2-wr3', name: 'Zinger Roll Paratha' },
        { id: 'c2-wr4', name: 'Zinger Roll Paratha (Cheese)' },
      ]},
    ]
  },
  {
    id: '3',
    name: 'Concordia 3',
    location: 'In front of NUST Main Office',
    description: 'The most central cafe on campus. Always buzzing with students from every department. Great for a quick bite or a long hangout.',
    baseRating: 3.9,
    baseReviews: 89,
    emoji: '🏛️',
    menu: [
      { cat: 'Sandwiches & Burgers', items: [
        { id: 'c3-sb1',  name: 'Tikka Sandwich (2P)' },
        { id: 'c3-sb2',  name: 'Tikka Sandwich (4P)' },
        { id: 'c3-sb3',  name: 'Tikka Burger' },
        { id: 'c3-sb4',  name: 'Egg Shami Burger' },
        { id: 'c3-sb5',  name: 'Shami Burger' },
        { id: 'c3-sb6',  name: 'Chicken Cheese Burger' },
        { id: 'c3-sb7',  name: 'Grilled Chicken Burger' },
        { id: 'c3-sb8',  name: 'Zinger Burger' },
        { id: 'c3-sb9',  name: 'Chapli Kabab Burger' },
        { id: 'c3-sb10', name: 'Chicken Mayo Sandwich' },
        { id: 'c3-sb11', name: 'Club Sandwich' },
      ]},
      { cat: 'Shawarma & Wraps', items: [
        { id: 'c3-wr1', name: 'Chicken Shawarma' },
        { id: 'c3-wr2', name: 'Chicken Cheese Shawarma' },
        { id: 'c3-wr3', name: 'Zinger Roll Paratha' },
        { id: 'c3-wr4', name: 'Zinger Roll Paratha (Cheese)' },
      ]},
      { cat: 'Pizza', items: [
        { id: 'c3-pz1', name: 'Pizza Slice / Small Pizza' },
        { id: 'c3-pz2', name: 'Chicken Tikka Pizza (S/M/L)' },
        { id: 'c3-pz3', name: 'Pizza (Extra Large)' },
        { id: 'c3-pz4', name: 'Pizza (Family)' },
        { id: 'c3-pz5', name: 'Crown Crust Pizza (S/M/L)' },
      ]},
    ]
  }
];

function getCafe(id) { return CAFES.find(c => c.id === id) || null; }

function getCafeRating(cafeId) {
  const reviews = DB.where('reviews', 'cafeId', cafeId);
  if (!reviews.length) {
    const c = getCafe(cafeId);
    return { avg: c ? c.baseRating : 0, count: c ? c.baseReviews : 0 };
  }
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  return { avg, count: reviews.length };
}

function renderStars(rating, size = 14) {
  const full = Math.floor(rating);
  const half = (rating % 1) >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const s = `width:${size}px;height:${size}px;flex-shrink:0;`;
  const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
  let h = '';
  for (let i = 0; i < full; i++)  h += `<svg style="${s}fill:#00C8F0;filter:drop-shadow(0 0 4px rgba(0,200,240,0.5));" viewBox="0 0 24 24"><path d="${starPath}"/></svg>`;
  if (half)                        h += `<svg style="${s}fill:none;stroke:#00C8F0;stroke-width:1.5" viewBox="0 0 24 24"><path d="${starPath}"/></svg>`;
  for (let i = 0; i < empty; i++) h += `<svg style="${s}fill:none;stroke:rgba(0,200,240,0.2);stroke-width:1.5" viewBox="0 0 24 24"><path d="${starPath}"/></svg>`;
  return h;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

window.CAFES = CAFES;
window.getCafe = getCafe;
window.getCafeRating = getCafeRating;
window.renderStars = renderStars;
window.timeAgo = timeAgo;
