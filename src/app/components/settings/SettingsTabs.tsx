"use client";

import { useState } from "react";
import { Mail, Link2, SlidersHorizontal, ShieldCheck, Users, Sparkles } from "lucide-react";
import EmailGatewaysTable from "./EmailGatewaysTable";
import ReferralSettings from "./ReferralSettings";
import GlobalSettings from "./GlobalSettings";
import VerifaliaCredentialsTable from "./VerifaliaCredentialsTable";
import AuthUsersSettings from "./AuthUsersSettings";
import LLMSettings from "./LLMSettings";

export type SettingsTab = "email-gateways" | "referral" | "global" | "verifalia" | "auth" | "llm";

const TABS: { key: SettingsTab; label: string; icon: typeof Mail }[] = [
    { key: "email-gateways", label: "Email Gateways", icon: Mail },
    { key: "referral", label: "Referral Settings", icon: Link2 },
    { key: "global", label: "Gmail Api Schedular", icon: SlidersHorizontal },
    { key: "verifalia", label: "Verifalia Credentials", icon: ShieldCheck },
    { key: "auth", label: "Auth Users", icon: Users },
    { key: "llm", label: "LLM Settings", icon: Sparkles },
];

export default function SettingsTabs({ defaultTab = "email-gateways" }: { defaultTab?: SettingsTab }) {
    const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

    return (
        <div className="bg-white min-h-screen">
            <div className="border-b border-gray-200 px-3 pt-3">
                <h1 className="text-lg font-bold text-gray-800 mb-3">Settings</h1>
                <div className="flex gap-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t border border-b-0 transition-colors ${activeTab === key
                                ? "bg-white border-gray-200 text-gray-800"
                                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                }`}
                            style={activeTab === key ? { marginBottom: "-1px" } : undefined}
                        >
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {activeTab === "email-gateways" && <EmailGatewaysTable />}
                {activeTab === "referral" && <ReferralSettings />}
                {activeTab === "global" && <GlobalSettings />}
                {activeTab === "verifalia" && <VerifaliaCredentialsTable />}
                {activeTab === "auth" && <AuthUsersSettings />}
                {activeTab === "llm" && <LLMSettings />}
            </div>
        </div>
    );
}
