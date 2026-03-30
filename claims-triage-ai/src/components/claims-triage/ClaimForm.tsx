"use client";

import { useState } from "react";

interface ClaimFormProps {
  onSubmit: (claim: ClaimPayload) => void;
  isLoading: boolean;
}

export interface ClaimPayload {
  policy_number: string;
  claim_amount: number;
  claim_date: string;
  claim_type: string;
  description: string;
}

const EXAMPLE_CLAIMS = [
  {
    label: "1. Simple property damage",
    payload: {
      policy_number: "POL-2024-001234",
      claim_amount: 15000,
      claim_date: "2024-09-15",
      claim_type: "property",
      description: "Storm damage to roof tiles and guttering at insured commercial premises. Building surveyor has assessed damage and provided repair estimate of £15,000. No structural damage. Temporary repairs already completed to prevent further water ingress.",
    },
  },
  {
    label: "2. Expired motor policy",
    payload: {
      policy_number: "POL-2024-001235",
      claim_amount: 45000,
      claim_date: "2024-09-20",
      claim_type: "motor",
      description: "Fleet vehicle involved in multi-vehicle collision on the M25. Driver sustained minor injuries. Third party vehicle also damaged. Claim for vehicle repair and third-party liability.",
    },
  },
  {
    label: "3. High-value cyber (Solvency II)",
    payload: {
      policy_number: "POL-2024-001236",
      claim_amount: 2000000,
      claim_date: "2024-08-10",
      claim_type: "cyber",
      description: "Major ransomware attack affecting all production systems. Business interruption estimated at £1.5M with additional £500K in forensic investigation and remediation costs. Attacker exploited zero-day vulnerability. Customer data potentially compromised — 50,000 records.",
    },
  },
  {
    label: "4. Suspicious fraud claim",
    payload: {
      policy_number: "POL-2024-001237",
      claim_amount: 190000,
      claim_date: "2024-11-15",
      claim_type: "property",
      description: "Total loss of commercial property contents due to fire. No witnesses. Fire brigade report pending. Cash settlement preferred. All inventory records destroyed in the fire. Claim amount represents 95% of sum insured.",
    },
  },
  {
    label: "5. D&O exclusion match",
    payload: {
      policy_number: "POL-2024-001238",
      claim_amount: 1500000,
      claim_date: "2024-10-01",
      claim_type: "D&O",
      description: "Shareholder derivative action against three board members for alleged breach of fiduciary duty. The claim relates to circumstances first reported to the company in March 2024 — prior to policy inception in April 2024. Defence costs estimated at £1.5M.",
    },
  },
  {
    label: "6. Marine cargo (Lloyd's)",
    payload: {
      policy_number: "POL-2024-001239",
      claim_amount: 750000,
      claim_date: "2024-07-20",
      claim_type: "marine",
      description: "Container of high-value electronics lost overboard during severe weather in the North Atlantic. Bill of lading and cargo manifest available. Vessel master's report confirms storm force conditions. Salvage not attempted due to depth.",
    },
  },
  {
    label: "7. Small liability (fast track)",
    payload: {
      policy_number: "POL-2024-001240",
      claim_amount: 5000,
      claim_date: "2024-10-15",
      claim_type: "liability",
      description: "Client alleges minor data entry error in consulting report caused £5,000 in rework costs. Insured accepts responsibility. Clean claims history, policy held for 3 years. Straightforward professional negligence.",
    },
  },
  {
    label: "8. Flood — exclusion applies",
    payload: {
      policy_number: "POL-2024-001241",
      claim_amount: 350000,
      claim_date: "2024-10-20",
      claim_type: "property",
      description: "Extensive flood damage to ground floor of commercial property following river breach. Water levels reached 1.2 metres. All ground-floor stock, fixtures, and electrical systems destroyed. Building requires full ground-floor refit.",
    },
  },
  {
    label: "9. Repeat claimant motor",
    payload: {
      policy_number: "POL-2024-001242",
      claim_amount: 85000,
      claim_date: "2024-09-01",
      claim_type: "motor",
      description: "Delivery van theft from insured premises. Vehicle found burnt out 3 days later. This is the fourth claim on this policy in 12 months. Previous claims were for windscreen damage, minor collision, and tool theft from vehicle.",
    },
  },
  {
    label: "10. Cyber — ICO notification",
    payload: {
      policy_number: "POL-2024-001243",
      claim_amount: 800000,
      claim_date: "2024-11-01",
      claim_type: "cyber",
      description: "Data breach discovered affecting customer payment card information. Approximately 25,000 customer records exposed. Breach traced to compromised third-party payment processor. Costs include forensic investigation, customer notification, credit monitoring, and potential regulatory fines.",
    },
  },
];

export function ClaimForm({ onSubmit, isLoading }: ClaimFormProps) {
  const [policyNumber, setPolicyNumber] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimType, setClaimType] = useState("property");
  const [description, setDescription] = useState("");

  const handleExampleClick = (payload: ClaimPayload) => {
    setPolicyNumber(payload.policy_number);
    setClaimAmount(String(payload.claim_amount));
    setClaimDate(payload.claim_date);
    setClaimType(payload.claim_type);
    setDescription(payload.description);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      policy_number: policyNumber,
      claim_amount: parseFloat(claimAmount) || 0,
      claim_date: claimDate || new Date().toISOString().split("T")[0],
      claim_type: claimType,
      description,
    });
  };

  return (
    <div>
      <div className="ct-examples">
        <div className="ct-examples-label">Load example claim:</div>
        <div className="ct-examples-grid">
          {EXAMPLE_CLAIMS.map((ex, i) => (
            <button
              key={i}
              className="ct-example-btn"
              onClick={() => handleExampleClick(ex.payload)}
              disabled={isLoading}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <form className="ct-form" onSubmit={handleSubmit}>
        <div className="ct-form-row">
          <label className="ct-field">
            <span className="ct-field-label">Policy Number</span>
            <input
              className="ct-input"
              type="text"
              placeholder="POL-2024-001234"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              required
            />
          </label>
          <label className="ct-field">
            <span className="ct-field-label">Claim Amount (GBP)</span>
            <input
              className="ct-input"
              type="number"
              min={0}
              step={100}
              placeholder="15000"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="ct-form-row">
          <label className="ct-field">
            <span className="ct-field-label">Claim Date</span>
            <input
              className="ct-input"
              type="date"
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              required
            />
          </label>
          <label className="ct-field">
            <span className="ct-field-label">Claim Type</span>
            <select
              className="ct-input"
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
            >
              <option value="property">Property</option>
              <option value="motor">Motor</option>
              <option value="liability">Liability</option>
              <option value="marine">Marine</option>
              <option value="cyber">Cyber</option>
              <option value="D&O">D&O</option>
            </select>
          </label>
        </div>
        <label className="ct-field">
          <span className="ct-field-label">Claim Description</span>
          <textarea
            className="ct-input ct-textarea"
            rows={4}
            placeholder="Describe the claim in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <button className="ct-submit" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="ct-spinner" />
              Running Triage Agent...
            </>
          ) : (
            "Submit Claim for Triage"
          )}
        </button>
      </form>
    </div>
  );
}
