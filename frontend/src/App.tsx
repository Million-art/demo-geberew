import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type SupplierOffer = {
  product: string;
  category: string;
  estimatedPricePerUnit: number;
  inStock: boolean;
};

type Supplier = {
  id: string;
  name: string;
  description: string;
  regions: string[];
  rating: number;
  verified: boolean;
  offers: SupplierOffer[];
};

type FarmerRequest = {
  id: string;
  product: string;
  category: string;
  quantity: number;
  unit: string;
  region: string;
  district: string;
  maxPricePerUnit?: number;
  notes: string;
  status: string;
  createdAt: string;
  matchScore: number;
  leadCostCredits: number;
  unlocked: boolean;
  contact?: LeadContact;
};

type Overview = {
  supplier: Supplier;
  metrics: {
    openRequests: number;
    matchedRequests: number;
    unlockedLeads: number;
    regionsCovered: number;
  };
};

type RequestStatus = 'open' | 'contacted' | 'fulfilled';

type LeadContact = {
  farmerName: string;
  phone: string;
};

type Tab = 'Overview' | 'Requests' | 'My leads' | 'Suppliers';

const productCategories: Record<string, string> = {
  'Maize seeds': 'Seeds',
  'Wheat seeds': 'Seeds',
  'Urea fertilizer': 'Fertilizers',
  'NPK fertilizer': 'Fertilizers',
  'Maize pesticide': 'Pesticides',
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

function App() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<FarmerRequest[]>([]);
  const [leads, setLeads] = useState<FarmerRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Record<string, LeadContact>>({});
  const [search, setSearch] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadMarketplace() {
    setLoading(true);
    setError('');
    try {
      const [nextOverview, nextRequests, nextLeads, nextSuppliers] = await Promise.all([
        api<Overview>('/api/marketplace/overview'),
        api<FarmerRequest[]>('/api/marketplace/requests'),
        api<FarmerRequest[]>('/api/marketplace/requests?view=leads'),
        api<Supplier[]>('/api/marketplace/suppliers'),
      ]);
      setOverview(nextOverview);
      setRequests(nextRequests);
      setLeads(nextLeads);
      setSuppliers(nextSuppliers);
      const nextContacts: Record<string, LeadContact> = {};
      for (const request of nextLeads) {
        if (request.unlocked && request.contact) {
          nextContacts[request.id] = request.contact;
        }
      }
      setContacts(nextContacts);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load the marketplace.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarketplace();
  }, []);

  const visibleRequests = useMemo(() => {
    const source =
      tab === 'My leads'
        ? leads
        : requests;
    const query = search.trim().toLowerCase();
    return query
      ? source.filter((request) =>
          `${request.product} ${request.region} ${request.district} ${request.category}`
            .toLowerCase()
            .includes(query),
        )
      : source;
  }, [requests, search, tab]);

  async function unlockLead(requestId: string) {
    setUnlockingId(requestId);
    setError('');
    try {
      const result = await api<LeadContact & { requestId: string }>(
        `/api/marketplace/requests/${requestId}/unlock`,
        { method: 'POST' },
      );
      setContacts((current) => ({ ...current, [requestId]: result }));
      setNotice('Demo lead unlocked. No real payment was processed.');
      await loadMarketplace();
    } catch (unlockError) {
      setError(
        unlockError instanceof Error
          ? unlockError.message
          : 'Could not unlock this lead.',
      );
    } finally {
      setUnlockingId(null);
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const product = String(formData.get('product'));
    const payload = {
      farmerName: String(formData.get('farmerName')).trim(),
      phone: String(formData.get('phone')).trim(),
      product,
      category: productCategories[product],
      quantity: Number(formData.get('quantity')),
      unit: String(formData.get('unit')),
      region: String(formData.get('region')).trim(),
      district: String(formData.get('district')).trim(),
      maxPricePerUnit: Number(formData.get('maxPricePerUnit')) || undefined,
      notes: String(formData.get('notes')).trim(),
    };

    try {
      await api<FarmerRequest>('/api/marketplace/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      form.reset();
      setShowRequestForm(false);
      setTab('Requests');
      setNotice('Farmer request received and added to the marketplace.');
      await loadMarketplace();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not create the request.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateRequestStatus(requestId: string, status: RequestStatus) {
    setError('');
    try {
      await api<FarmerRequest>(
        `/api/marketplace/requests/${requestId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      );
      setNotice(`Lead marked ${status}.`);
      await loadMarketplace();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'Could not update the request status.',
      );
    }
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const product = String(formData.get('product'));
    try {
      await api<Supplier>('/api/marketplace/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name')).trim(),
          description: String(formData.get('description')).trim(),
          regions: String(formData.get('regions'))
            .split(',')
            .map((region) => region.trim())
            .filter(Boolean),
          offers: [
            {
              product,
              category: productCategories[product],
              estimatedPricePerUnit: Number(
                formData.get('estimatedPricePerUnit'),
              ),
            },
          ],
        }),
      });
      form.reset();
      setShowSupplierForm(false);
      setNotice('Supplier registration submitted for verification.');
      await loadMarketplace();
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : 'Could not register the supplier.',
      );
    } finally {
      setSaving(false);
    }
  }

  const tabs: Tab[] = ['Overview', 'Requests', 'My leads', 'Suppliers'];
  const pageTitle =
    tab === 'Overview'
      ? 'Good morning, GreenGrow'
      : tab === 'My leads'
        ? 'Your unlocked leads'
        : tab === 'Suppliers'
          ? 'Supplier directory'
          : 'Farmer requests';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab('Overview')}>
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19.5 4.5C11 4.5 5 7.3 5 13.1c0 3 2.2 5 4.9 5 5.3 0 9.6-6.1 9.6-13.6Z" />
              <path d="M3.5 21c2.4-5.3 6-8.6 11-11" />
            </svg>
          </span>
          <span className="brand-copy"><strong>GreenLink</strong><small>AGRI MARKETPLACE</small></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {tabs.map((item, index) => (
            <button
              className={`nav-item ${tab === item ? 'active' : ''}`}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {['▦', '⌕', '◇', '♧'][index]}
              </span>
              <span>{item}</span>
              {item === 'Requests' && requests.length > 0 && (
                <span className="nav-count">{requests.length}</span>
              )}
              {showSupplierForm && (
                <div className="modal-backdrop" onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setShowSupplierForm(false);
                }}>
                  <section aria-labelledby="supplier-form-title" aria-modal="true" className="request-modal" role="dialog">
                    <div className="modal-heading">
                      <div><span className="modal-kicker">SUPPLIER ONBOARDING</span><h2 id="supplier-form-title">Register a supplier</h2></div>
                      <button className="modal-close" onClick={() => setShowSupplierForm(false)} type="button" aria-label="Close">×</button>
                    </div>
                    <p className="modal-description">Add a supplier profile and an initial product offer. New profiles are marked unverified in this demo.</p>
                    <form className="request-form" onSubmit={(event) => void submitSupplier(event)}>
                      <label>Business name<input name="name" required placeholder="e.g. Harvest Input Co." /></label>
                      <label>Business description<input name="description" required placeholder="What products and services do you provide?" /></label>
                      <label>Service regions <span className="optional">(comma separated)</span><input name="regions" required placeholder="e.g. Oromia, Amhara" /></label>
                      <div className="form-row">
                        <label>Product<select name="product">
                          <option value="Maize seeds">Maize seeds</option>
                          <option value="Wheat seeds">Wheat seeds</option>
                          <option value="Urea fertilizer">Urea fertilizer</option>
                          <option value="NPK fertilizer">NPK fertilizer</option>
                          <option value="Maize pesticide">Maize pesticide</option>
                        </select></label>
                        <label>Estimated price / unit<input min="1" name="estimatedPricePerUnit" required type="number" /></label>
                      </div>
                      <div className="form-note">Registration is a demo flow. Verification and supplier matching require production onboarding.</div>
                      <div className="modal-actions">
                        <button className="secondary-button" onClick={() => setShowSupplierForm(false)} type="button">Cancel</button>
                        <button className="primary-button" disabled={saving} type="submit">{saving ? 'Submitting…' : 'Submit registration'} <span>→</span></button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-help">
          <span className="help-mark">?</span>
          <div><strong>Need a hand?</strong><small>Visit our help center</small></div>
          <span className="help-arrow">↗</span>
        </div>
        <div className="profile">
          <div className="avatar">GG</div>
          <div className="profile-copy"><strong>GreenGrow Supply</strong><small>Verified supplier</small></div>
          <span className="profile-menu">···</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">Marketplace <span>/</span> <strong>{tab}</strong></div>
          <div className="top-actions">
            <span className="demo-badge"><span /> DEMO WORKSPACE</span>
            <button className="icon-button notification-button" type="button" aria-label="Notifications">♧<i /></button>
            <div className="top-avatar">GG</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="date-line">THURSDAY, OCTOBER 29</div>
              <h1>{pageTitle}<span>.</span></h1>
              <p>
                {tab === 'Suppliers'
                  ? 'Explore verified agricultural suppliers and their available products.'
                  : tab === 'My leads'
                    ? 'Farmer requests you have unlocked and can now follow up on.'
                    : 'Find the right farmer requests for your products and service area.'}
              </p>
            </div>
            <button className="primary-button" onClick={() => setShowRequestForm(true)} type="button">
              <span>＋</span> Add farmer request
            </button>
          </div>

          {error && <div className="alert error-alert" role="alert">{error}</div>}
          {notice && (
            <div className="alert success-alert" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} type="button" aria-label="Dismiss">×</button>
            </div>
          )}

          {tab === 'Overview' && (
            <>
              <section className="metric-grid" aria-label="Marketplace overview">
                <MetricCard label="Open requests" value={overview?.metrics.openRequests} note="Across the marketplace" icon="⌕" />
                <MetricCard label="Best-fit matches" value={overview?.metrics.matchedRequests} note="Based on your catalog" icon="✳" />
                <MetricCard label="Unlocked leads" value={overview?.metrics.unlockedLeads} note="Ready for follow-up" icon="◇" />
                <MetricCard label="Regions covered" value={overview?.metrics.regionsCovered} note="In your service area" icon="⌖" />
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div><h2>Recommended requests</h2><p>Matched to your products, availability, pricing, and regions.</p></div>
                  <button className="text-button" onClick={() => setTab('Requests')} type="button">View all requests <span>→</span></button>
                </div>
                <RequestGrid requests={requests.slice(0, 3)} contacts={contacts} unlockingId={unlockingId} onUnlock={unlockLead} onUpdateStatus={updateRequestStatus} loading={loading} />
              </section>

              <section className="section-block supplier-summary">
                <div className="section-heading">
                  <div><h2>Your supplier profile</h2><p>How farmers see your business in the marketplace.</p></div>
                  <button className="text-button" onClick={() => setTab('Suppliers')} type="button">View directory <span>→</span></button>
                </div>
                {overview && <SupplierCard supplier={overview.supplier} compact />}
              </section>
            </>
          )}

          {(tab === 'Requests' || tab === 'My leads') && (
            <section className="section-block requests-section">
              <div className="toolbar">
                <label className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products or locations"
                    value={search}
                  />
                  <kbd>⌘ K</kbd>
                </label>
                <button className="filter-button" type="button" onClick={() => setSearch('')}>
                  <span>☷</span> Clear search
                </button>
                <span className="results-count">{visibleRequests.length} requests</span>
              </div>
              <RequestGrid requests={visibleRequests} contacts={contacts} unlockingId={unlockingId} onUnlock={unlockLead} onUpdateStatus={updateRequestStatus} loading={loading} />
              {!loading && visibleRequests.length === 0 && (
                <div className="empty-state"><span>⌕</span><h3>No requests found</h3><p>Try a different search or check back as new farmer requests arrive.</p></div>
              )}
            </section>
          )}

          {tab === 'Suppliers' && (
            <section className="section-block">
              <div className="section-heading directory-heading">
                <div><h2>Verified suppliers</h2><p>Supplier profiles and current product availability.</p></div>
                <div className="directory-actions">
                  <span className="results-count">{suppliers.length} suppliers</span>
                  <button className="primary-button" onClick={() => setShowSupplierForm(true)} type="button"><span>＋</span> Register supplier</button>
                </div>
              </div>
              <div className="supplier-grid">
                {suppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)}
              </div>
            </section>
          )}

          <footer className="content-footer">
            <span>GreenLink <span className="footer-dot">·</span> Connecting growers and suppliers</span>
            <span>Marketplace preview <span className="footer-dot">·</span> Data resets when the API restarts</span>
          </footer>
        </div>
      </main>

      {showRequestForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowRequestForm(false);
        }}>
          <section aria-labelledby="request-title" aria-modal="true" className="request-modal" role="dialog">
            <div className="modal-heading">
              <div><span className="modal-kicker">FARMER INTAKE</span><h2 id="request-title">Add a farmer request</h2></div>
              <button className="modal-close" onClick={() => setShowRequestForm(false)} type="button" aria-label="Close">×</button>
            </div>
            <p className="modal-description">Record a request received by phone or USSD. Contact details remain hidden from suppliers until the lead is unlocked.</p>
            <form className="request-form" onSubmit={(event) => void submitRequest(event)}>
              <label>Farmer name<input name="farmerName" required placeholder="e.g. Aster Desta" /></label>
              <label>Phone number<input name="phone" required placeholder="Contact number" type="tel" /></label>
              <div className="form-row">
                <label>Product<select name="product" required>
                  <option value="Maize seeds">Maize seeds</option>
                  <option value="Wheat seeds">Wheat seeds</option>
                  <option value="Urea fertilizer">Urea fertilizer</option>
                  <option value="NPK fertilizer">NPK fertilizer</option>
                  <option value="Maize pesticide">Maize pesticide</option>
                </select></label>
                <label>Quantity<input name="quantity" min="1" required type="number" /></label>
              </div>
              <div className="form-row">
                <label>Unit<select name="unit"><option>kg</option><option>bags</option><option>liters</option><option>units</option></select></label>
                <label>Max price / unit <span className="optional">(optional)</span><input min="1" name="maxPricePerUnit" placeholder="Local currency" type="number" /></label>
              </div>
              <div className="form-row">
                <label>Region<input name="region" required placeholder="e.g. Oromia" /></label>
                <label>District<input name="district" required placeholder="e.g. Adama" /></label>
              </div>
              <label>Additional details<textarea name="notes" placeholder="Preferred quality, delivery timing, or other details" rows={3} /></label>
              <div className="form-note">Demo mode: requests are stored in memory and will reset when the API restarts.</div>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setShowRequestForm(false)} type="button">Cancel</button>
                <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save request'} <span>→</span></button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, note, icon }: { label: string; value?: number; note: string; icon: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div>
      <strong>{value ?? '—'}</strong>
      <small><span className="metric-trend">↗</span> {note}</small>
    </article>
  );
}

function RequestGrid({
  requests,
  contacts,
  unlockingId,
  onUnlock,
  onUpdateStatus,
  loading,
}: {
  requests: FarmerRequest[];
  contacts: Record<string, LeadContact>;
  unlockingId: string | null;
  onUnlock: (id: string) => void;
  onUpdateStatus: (id: string, status: RequestStatus) => void;
  loading: boolean;
}) {
  if (loading && requests.length === 0) {
    return <div className="loading-state"><span className="spinner" /> Loading farmer requests…</div>;
  }
  return (
    <div className="request-grid">
      {requests.map((request) => (
        <article className="request-card" key={request.id}>
          <div className="request-card-top">
            <span className="category-tag">{request.category}</span>
            <span className="match-tag"><span>✳</span> {request.matchScore}% match</span>
          </div>
          <h3>{request.product}</h3>
          <div className="request-location"><span>⌖</span> {request.district}, {request.region}</div>
          <div className="request-facts">
            <div><small>QUANTITY</small><strong>{request.quantity} {request.unit}</strong></div>
            <div><small>MAX. PRICE / UNIT</small><strong>{request.maxPricePerUnit ? request.maxPricePerUnit.toLocaleString() : 'Open to offers'}</strong></div>
          </div>
          <p className="request-notes">{request.notes || 'No extra details provided.'}</p>
          <div className="request-card-footer">
            <span className="request-age">{relativeDate(request.createdAt)}</span>
            {request.unlocked ? (
              <div className="lead-actions">
                <div className="lead-contact">
                  {contacts[request.id] ? (
                    <><strong>{contacts[request.id].farmerName}</strong><a href={`tel:${contacts[request.id].phone}`}>{contacts[request.id].phone}</a></>
                  ) : <span>Lead unlocked</span>}
                  <span className="lead-status">{request.status}</span>
                </div>
                {request.status === 'open' && <button className="track-button" onClick={() => onUpdateStatus(request.id, 'contacted')} type="button">Mark contacted</button>}
                {request.status === 'contacted' && <button className="track-button" onClick={() => onUpdateStatus(request.id, 'fulfilled')} type="button">Mark fulfilled</button>}
              </div>
            ) : (
              <button className="unlock-button" disabled={unlockingId === request.id} onClick={() => onUnlock(request.id)} type="button">
                {unlockingId === request.id ? 'Unlocking…' : `Unlock · ${request.leadCostCredits} credits`}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function SupplierCard({ supplier, compact = false }: { supplier: Supplier; compact?: boolean }) {
  return (
    <article className={`supplier-card ${compact ? 'compact' : ''}`}>
      <div className="supplier-card-head">
        <div className="supplier-logo">GG</div>
        <div className="supplier-title"><h3>{supplier.name}</h3><p>{supplier.description}</p></div>
        <span className={`verified-tag ${supplier.verified ? '' : 'pending'}`}>{supplier.verified ? '✓ Verified' : 'Pending review'}</span>
      </div>
      <div className="supplier-meta"><span>★ {supplier.rating.toFixed(1)} supplier rating</span><span>⌖ {supplier.regions.join(', ')}</span></div>
      <div className="offer-list">
        {supplier.offers.slice(0, compact ? 3 : undefined).map((offer) => (
          <div className="offer-row" key={offer.product}>
            <span className={`stock-dot ${offer.inStock ? 'in-stock' : ''}`} />
            <span>{offer.product}</span>
            <span className="offer-price">{offer.estimatedPricePerUnit.toLocaleString()} / unit</span>
            <span className={`stock-label ${offer.inStock ? 'available' : ''}`}>{offer.inStock ? 'In stock' : 'Out of stock'}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function relativeDate(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default App;
