import { useCallback, useEffect, useRef, useState } from "react";

async function request(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export default function App() {
  const [tab, setTab] = useState("discover");
  const [view, setView] = useState("feed");
  const [feed, setFeed] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState("");
  const pointerStart = useRef(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [feedData, matchData] = await Promise.all([request("/feed"), request("/matches")]);
      setFeed(feedData.profiles);
      setMatches(matchData.matches);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const swipe = useCallback(async (action) => {
    const profile = feed[0];
    if (!profile || busy) return;
    setBusy(true);
    setError("");
    setExiting(action);
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    try {
      const result = await request("/swipe", {
        method: "POST",
        body: JSON.stringify({ profileId: profile.id, action })
      });
      setFeed((current) => current.filter((item) => item.id !== profile.id));
      setDragX(0);
      setExiting("");
      if (result.matched) {
        setCurrentMatch(result.match);
        setMatches((current) => current.some((item) => item.id === result.match.id)
          ? current
          : [result.match, ...current]);
      }
    } catch (swipeError) {
      setError(swipeError.message);
      setExiting("");
      setDragX(0);
    } finally {
      setBusy(false);
    }
  }, [busy, feed]);

  useEffect(() => {
    function onKeyDown(event) {
      if (tab !== "discover" || view !== "feed" || currentMatch || busy) return;
      if (event.key === "ArrowRight") swipe("like");
      if (event.key === "ArrowLeft") swipe("pass");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, currentMatch, swipe, tab, view]);

  const openMatches = async () => {
    setView("matches");
    setError("");
    try {
      const data = await request("/matches");
      setMatches(data.matches);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const closeMatch = () => setCurrentMatch(null);
  const card = feed[0];
  const nextCard = feed[1];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()} aria-label="Coy home">
          coy<span className="brand-dot">.</span>
        </a>
        <div className="topbar-note"><span className="online-dot" /> A little closer, at your pace</div>
        <button className="avatar-button" aria-label="Your profile">Y</button>
      </header>

      <main>
        {tab === "home" ? (
          <section className="home-blank" aria-label="Home tab" />
        ) : (
          <section className="discover">
            <div className="discover-heading">
              <div>
                <p className="eyebrow">GOOD THINGS START HERE</p>
                <h1>{view === "matches" ? "Your connections" : "Discover"}</h1>
                <p className="subheading">
                  {view === "matches" ? "A little spark, from both sides." : "Meet someone new, one profile at a time."}
                </p>
              </div>
              <button
                className={`matches-link ${view === "matches" ? "selected" : ""}`}
                onClick={view === "matches" ? () => setView("feed") : openMatches}
              >
                <span className="heart-icon">♡</span>
                Matches <span className="match-count">{matches.length}</span>
              </button>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button onClick={loadFeed}>Try again</button>
              </div>
            )}

            {view === "matches" ? (
              <MatchesView matches={matches} />
            ) : loading ? (
              <div className="loading-state"><span className="spinner" /> Finding your people...</div>
            ) : !card ? (
              <div className="empty-state">
                <div className="empty-illustration">✳</div>
                <h2>You’re all caught up</h2>
                <p>That’s everyone for now. Check back soon for new faces.</p>
              </div>
            ) : (
              <div className="discovery-stage">
                <div className="card-stack">
                  {nextCard && <div className="profile-card back-card" aria-hidden="true" />}
                  <article
                    className={`profile-card active-card ${exiting ? `exit-${exiting}` : ""}`}
                    style={{ "--drag-x": `${dragX}px` }}
                    onPointerDown={(event) => {
                      if (busy) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      pointerStart.current = { x: event.clientX, y: event.clientY };
                    }}
                    onPointerMove={(event) => {
                      if (!pointerStart.current || busy) return;
                      setDragX(event.clientX - pointerStart.current.x);
                    }}
                    onPointerUp={() => {
                      if (!pointerStart.current) return;
                      pointerStart.current = null;
                      if (dragX > 90) swipe("like");
                      else if (dragX < -90) swipe("pass");
                      else setDragX(0);
                    }}
                    onPointerCancel={() => {
                      pointerStart.current = null;
                      setDragX(0);
                    }}
                  >
                    <img className="profile-photo" src={card.photo} alt={card.name} draggable="false" />
                    <div className="photo-shade" />
                    <div className={`swipe-stamp ${dragX > 35 ? "stamp-like" : dragX < -35 ? "stamp-pass" : ""}`}>
                      {dragX > 35 ? "LIKE" : dragX < -35 ? "PASS" : ""}
                    </div>
                    <div className="card-content">
                      <div className="location-pill"><span>⌖</span> {card.location}</div>
                      <h2>{card.name}, <span>{card.age}</span></h2>
                      <p className="bio">{card.bio}</p>
                      <div className="interest-list">
                        {card.interests.map((interest) => <span className="interest" key={interest}>{interest}</span>)}
                      </div>
                    </div>
                  </article>
                </div>
                <p className="gesture-hint">Swipe to meet someone, or choose below</p>
                <div className="swipe-actions">
                  <button className="action-button pass-button" onClick={() => swipe("pass")} disabled={busy} aria-label="Pass">
                    <span>×</span>
                  </button>
                  <button className="action-button like-button" onClick={() => swipe("like")} disabled={busy} aria-label="Like">
                    <span>♥</span>
                  </button>
                </div>
                <p className="privacy-note"><span className="lock-icon">⌑</span> Likes stay private unless they’re mutual.</p>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={tab === "home" ? "nav-item active" : "nav-item"} onClick={() => setTab("home")}>
          <span className="nav-symbol">⌂</span><span>Home</span>
        </button>
        <button className={tab === "discover" ? "nav-item active" : "nav-item"} onClick={() => { setTab("discover"); setView("feed"); }}>
          <span className="nav-symbol">✳</span><span>Discover</span>
        </button>
      </nav>

      {currentMatch && (
        <div className="match-overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
          <div className="match-confetti confetti-one">✦</div>
          <div className="match-confetti confetti-two">✿</div>
          <div className="match-confetti confetti-three">✧</div>
          <button className="match-close" onClick={closeMatch} aria-label="Close match">×</button>
          <p className="eyebrow">THE FEELING IS MUTUAL</p>
          <h2 id="match-title">It’s a match!</h2>
          <p className="match-copy">You and {currentMatch.name} liked each other.</p>
          <img className="match-photo" src={currentMatch.photo} alt={currentMatch.name} />
          <button className="primary-button" onClick={closeMatch}>Keep discovering</button>
          <button className="text-button" onClick={() => { closeMatch(); openMatches(); }}>See all matches</button>
        </div>
      )}
    </div>
  );
}

function MatchesView({ matches }) {
  if (matches.length === 0) {
    return (
      <div className="empty-state matches-empty">
        <div className="empty-illustration heart-empty">♡</div>
        <h2>Your story starts with a match</h2>
        <p>When you both like each other, you’ll find them here.</p>
      </div>
    );
  }
  return (
    <div className="matches-grid">
      {matches.map((profile) => (
        <article className="match-card" key={profile.id}>
          <img src={profile.photo} alt="" />
          <div><h2>{profile.name}, {profile.age}</h2><p>{profile.location}</p></div>
          <span className="mutual-heart" aria-label="Mutual match">♥</span>
        </article>
      ))}
    </div>
  );
}
