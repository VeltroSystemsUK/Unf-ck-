import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
    getFirestore, collection, onSnapshot,
    addDoc, updateDoc, deleteDoc, doc, Timestamp, setDoc, Firestore
} from 'firebase/firestore';
import { 
    getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage 
} from 'firebase/storage';
import { GoogleGenAI } from "@google/genai";
import { 
    CheckCircle, Trash2, Loader2, Plus, 
    Award, BookOpen, 
    TrendingUp, Gift, Check, Play, Pause, RotateCcw, Hourglass,
    Flag, Edit2, Save, X, Trophy, Brain, Dumbbell, Leaf, Zap, Target,
    Frown, Meh, Smile, Laugh, Annoyed, Mic,
    Wallet, Calculator, Moon, Sun, MessageCircle, Send, Home,
    Timer, TrendingDown, ChevronLeft, ChevronRight, ChevronDown, Heart, ImageIcon, Square, ArrowDownToLine, Bot, DollarSign, Calendar, User, ArrowRight, Sparkles, LogOut, Clock, Droplets, CreditCard, Lock, ShieldCheck, Star, Settings, Activity, Megaphone, AlertTriangle, Construction, Coins, PartyPopper
} from 'lucide-react';
import { KaizenItem, UserMetadata, Reward, PriorityLevel, WinDefinition, WinCategory, HistoryEntry, AudioNote, FinancialGoal, RecurringBill, IncomeSource, SubscriptionTier, AppConfig } from './types';

// Declare global variables injected by the backend/environment
declare var __app_id: string | undefined;
declare var __firebase_config: string | undefined;
declare var __initial_auth_token: string | undefined;

// --- Global Config ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const manualFirebaseConfig = {
    // Add your config here if needed for local dev
};

const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
    ? JSON.parse(__firebase_config) 
    : manualFirebaseConfig;

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Constants ---
const POINTS_PER_TASK = 10;
const POINTS_PER_WIN = 5;
const BONUS_PERFECT_DAY = 50;
const POINTS_PER_SAVING_ACTION = 10;
const HISTORY_COLLECTION = 'kaizen_history';
const ITEMS_COLLECTION = 'kaizen_items';
const METADATA_DOC_ID = 'metadata';

const DEFAULT_WINS: WinDefinition[] = [
    { id: 0, title: "Drink 2L Water", category: 'nutrition' },
    { id: 1, title: "Eat a healthy breakfast", category: 'nutrition' },
    { id: 2, title: "No processed sugar", category: 'nutrition' },
    { id: 3, title: "30 min movement", category: 'body' },
    { id: 4, title: "Stretch / Yoga", category: 'body' },
    { id: 5, title: "10,000 Steps", category: 'body' },
    { id: 6, title: "10 min Meditation", category: 'mind' },
    { id: 7, title: "Read 10 pages", category: 'mind' },
    { id: 8, title: "Journal / Gratitude", category: 'mind' },
    { id: 9, title: "Sleep 8 hours", category: 'body' },
];

const MOODS = [
    { val: 1, Icon: Frown, label: 'Rough', color: 'text-red-500', activeBg: 'bg-red-50', activeBorder: 'border-red-500', darkActiveBg: 'dark:bg-red-900/20' },
    { val: 2, Icon: Annoyed, label: 'Down', color: 'text-orange-500', activeBg: 'bg-orange-50', activeBorder: 'border-orange-500', darkActiveBg: 'dark:bg-orange-900/20' },
    { val: 3, Icon: Meh, label: 'Okay', color: 'text-yellow-500', activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-500', darkActiveBg: 'dark:bg-yellow-900/20' },
    { val: 4, Icon: Smile, label: 'Good', color: 'text-lime-500', activeBg: 'bg-lime-50', activeBorder: 'border-lime-500', darkActiveBg: 'dark:bg-lime-900/20' },
    { val: 5, Icon: Laugh, label: 'Elated', color: 'text-emerald-500', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-500', darkActiveBg: 'dark:bg-emerald-900/20' },
];

const getWinStyles = (category: WinCategory) => {
    switch (category) {
        case 'mind':
            return {
                activeBg: 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800',
                iconBgActive: 'bg-violet-500 text-white',
                iconBgInactive: 'bg-violet-50 text-violet-500 dark:bg-violet-900/20 dark:text-violet-400',
                textActive: 'text-violet-900 dark:text-violet-100',
                checkColor: 'text-violet-500'
            };
        case 'body':
            return {
                activeBg: 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800',
                iconBgActive: 'bg-sky-500 text-white',
                iconBgInactive: 'bg-sky-50 text-sky-500 dark:bg-sky-900/20 dark:text-sky-400',
                textActive: 'text-sky-900 dark:text-sky-100',
                checkColor: 'text-sky-500'
            };
        case 'nutrition':
            return {
                activeBg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
                iconBgActive: 'bg-emerald-500 text-white',
                iconBgInactive: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400',
                textActive: 'text-emerald-900 dark:text-emerald-100',
                checkColor: 'text-emerald-500'
            };
        case 'growth':
            return {
                activeBg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
                iconBgActive: 'bg-amber-500 text-white',
                iconBgInactive: 'bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400',
                textActive: 'text-amber-900 dark:text-amber-100',
                checkColor: 'text-amber-500'
            };
        case 'wealth':
            return {
                activeBg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
                iconBgActive: 'bg-yellow-500 text-white',
                iconBgInactive: 'bg-yellow-50 text-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-400',
                textActive: 'text-yellow-900 dark:text-yellow-100',
                checkColor: 'text-yellow-500'
            };
        case 'fun':
            return {
                activeBg: 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800',
                iconBgActive: 'bg-pink-500 text-white',
                iconBgInactive: 'bg-pink-50 text-pink-500 dark:bg-pink-900/20 dark:text-pink-400',
                textActive: 'text-pink-900 dark:text-pink-100',
                checkColor: 'text-pink-500'
            };
        default:
             return {
                activeBg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800',
                iconBgActive: 'bg-indigo-500 text-white',
                iconBgInactive: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                textActive: 'text-indigo-900 dark:text-indigo-100',
                checkColor: 'text-indigo-500'
            };
    }
};

const getCategoryIcon = (category: WinCategory) => {
    switch (category) {
        case 'mind': return <Brain className="w-5 h-5" />;
        case 'body': return <Activity className="w-5 h-5" />;
        case 'nutrition': return <Leaf className="w-5 h-5" />;
        case 'growth': return <Zap className="w-5 h-5" />;
        case 'wealth': return <DollarSign className="w-5 h-5" />;
        case 'fun': return <PartyPopper className="w-5 h-5" />;
        default: return <Award className="w-5 h-5" />;
    }
};

const getCollectionPath = (userId: string, collectionName: string) => `artifacts/${appId}/users/${userId}/${collectionName}`;
const getMetadataDocRef = (userId: string, db: Firestore) => doc(db, `artifacts/${appId}/users/${userId}/user_data/${METADATA_DOC_ID}`);
const getDateString = (date = new Date()) => date.toISOString().slice(0, 10);

// --- Components ---

interface OnboardingProps {
    onComplete: (data: Partial<UserMetadata>) => void;
}

const OnboardingFlow: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [focus, setFocus] = useState<WinCategory | null>(null);
    const [secondaryFocus, setSecondaryFocus] = useState<WinCategory | null>(null);
    const [budget, setBudget] = useState('');
    const [currency, setCurrency] = useState('£');
    
    // Lifestyle State
    const [wakeTime, setWakeTime] = useState('07:00');
    const [bedTime, setBedTime] = useState('23:00');
    const [waterGoal, setWaterGoal] = useState(2);
    const [mindfulnessGoal, setMindfulnessGoal] = useState(10);

    // Membership State
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('lite');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const handleNext = () => setStep(s => s + 1);

    const handleComplete = () => {
        // Create customized wins based on input
        const customWins = JSON.parse(JSON.stringify(DEFAULT_WINS));
        
        // Update Water Goal
        const waterWin = customWins.find((w: any) => w.title.includes('Water'));
        if (waterWin) waterWin.title = `Drink ${waterGoal}L Water`;
        
        // Update Meditation Goal
        const medWin = customWins.find((w: any) => w.title.includes('Meditation'));
        if (medWin) medWin.title = `${mindfulnessGoal} min Meditation`;
        
        // Update Sleep Goal
        const sleepWin = customWins.find((w: any) => w.title.includes('Sleep'));
        if (sleepWin) sleepWin.title = `Sleep by ${bedTime}`;
        
        // Inject a Wealth Win if focused
        if (focus === 'wealth' || secondaryFocus === 'wealth') {
            const index = customWins.findIndex((w: any) => w.category === 'growth');
            if (index !== -1) {
                customWins[index] = { id: customWins[index].id, title: "Review Finances", category: 'wealth' };
            }
        }

        // Inject a Fun Win if focused
        if (focus === 'fun' || secondaryFocus === 'fun') {
             const index = customWins.findIndex((w: any) => w.category === 'growth');
             // Find a spot to replace, try to not overwrite wealth if both are selected
             if (index !== -1 && customWins[index].category !== 'wealth') {
                 customWins[index] = { id: customWins[index].id, title: "Do something just for fun", category: 'fun' };
             } else {
                 // Fallback replacement
                 customWins[8] = { id: 8, title: "Do something just for fun", category: 'fun' };
             }
        }

        const monthlyBudget = parseFloat(budget);
        const dailyBudget = isNaN(monthlyBudget) ? 0 : monthlyBudget / 30;

        onComplete({
            displayName: name,
            mainFocus: focus!,
            secondaryFocus: secondaryFocus!,
            defaultDailyBudget: dailyBudget,
            currencySymbol: currency,
            onboardingCompleted: true,
            wakeTime,
            bedTime,
            waterGoal,
            mindfulnessGoal,
            winDefinitions: customWins,
            subscriptionTier: selectedPlan
        });
    };

    const processPayment = () => {
        setIsProcessingPayment(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessingPayment(false);
            handleComplete();
        }, 2000);
    };

    const focusOptions = [
        { id: 'mind', icon: Brain, label: 'Mind', color: 'violet' },
        { id: 'body', icon: Activity, label: 'Health', color: 'sky' },
        { id: 'nutrition', icon: Leaf, label: 'Nutrition', color: 'emerald' },
        { id: 'wealth', icon: DollarSign, label: 'Money', color: 'yellow' },
        { id: 'growth', icon: Zap, label: 'Growth', color: 'amber' },
        { id: 'fun', icon: PartyPopper, label: 'Fun', color: 'pink' },
    ];

    const renderStep = () => {
        switch(step) {
            case 0: // Welcome
                return (
                    <div className="text-center space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-4 animate-blob">
                            <Sparkles className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            Welcome to Kaizen: LifeTrack
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                            Small steps. Continuous improvement. <br/>Let's build your better life, one day at a time.
                        </p>
                        <button onClick={handleNext} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 flex items-center mx-auto">
                            Begin Journey <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                );
            case 1: // Identity
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="text-center">
                            <h2 className="text-2xl font-bold dark:text-white mb-2">What should we call you?</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Your journey is personal.</p>
                         </div>
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800">
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Display Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                className="w-full text-2xl bg-transparent border-b-2 border-slate-200 dark:border-slate-700 py-2 focus:outline-none focus:border-indigo-500 font-medium dark:text-white"
                                placeholder="Enter your name"
                                autoFocus
                            />
                         </div>
                         <button onClick={handleNext} disabled={!name.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:shadow-none">
                            Continue
                        </button>
                    </div>
                );
            case 2: // Primary Focus
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="text-center">
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Choose a Primary Focus</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">We'll tailor your initial experience.</p>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            {focusOptions.map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={() => setFocus(item.id as WinCategory)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 ${focus === item.id 
                                        ? `border-${item.color}-500 bg-${item.color}-50 dark:bg-${item.color}-900/20 ring-2 ring-${item.color}-500/30` 
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'}`}
                                >
                                    <item.icon className={`w-8 h-8 mb-3 ${focus === item.id ? `text-${item.color}-600` : 'text-slate-400'}`} />
                                    <span className={`block font-bold ${focus === item.id ? `text-${item.color}-900 dark:text-${item.color}-100` : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</span>
                                </button>
                            ))}
                         </div>
                         <button onClick={handleNext} disabled={!focus} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:shadow-none">
                            Next Step
                        </button>
                    </div>
                );
            case 3: // Secondary Focus
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="text-center">
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Choose a Secondary Focus</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">To support your main goal.</p>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            {focusOptions.filter(i => i.id !== focus).map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={() => setSecondaryFocus(item.id as WinCategory)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 ${secondaryFocus === item.id 
                                        ? `border-${item.color}-500 bg-${item.color}-50 dark:bg-${item.color}-900/20 ring-2 ring-${item.color}-500/30` 
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'}`}
                                >
                                    <item.icon className={`w-8 h-8 mb-3 ${secondaryFocus === item.id ? `text-${item.color}-600` : 'text-slate-400'}`} />
                                    <span className={`block font-bold ${secondaryFocus === item.id ? `text-${item.color}-900 dark:text-${item.color}-100` : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</span>
                                </button>
                            ))}
                         </div>
                         <button onClick={handleNext} disabled={!secondaryFocus} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:shadow-none">
                            Next Step
                        </button>
                    </div>
                );
            case 4: // Rhythm (Lifestyle 1)
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center">
                            <div className="bg-sky-100 dark:bg-sky-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                            </div>
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Your Rhythm</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">When do you start and end your day?</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Wake Up Time</label>
                                <input 
                                    type="time" 
                                    value={wakeTime} 
                                    onChange={e => setWakeTime(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-lg dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Bed Time</label>
                                <input 
                                    type="time" 
                                    value={bedTime} 
                                    onChange={e => setBedTime(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-lg dark:text-white"
                                />
                            </div>
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                            Next Step
                        </button>
                    </div>
                );
            case 5: // Wellbeing Targets (Lifestyle 2)
                 return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Droplets className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Daily Targets</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Let's set some baseline goals.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800 space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs font-bold uppercase text-slate-400">Water Intake</label>
                                    <span className="text-sm font-bold text-sky-500">{waterGoal} Liters</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.5" max="4" step="0.1"
                                    value={waterGoal} 
                                    onChange={e => setWaterGoal(parseFloat(e.target.value))}
                                    className="w-full accent-sky-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs font-bold uppercase text-slate-400">Mindfulness</label>
                                    <span className="text-sm font-bold text-violet-500">{mindfulnessGoal} Mins</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="60" step="5"
                                    value={mindfulnessGoal} 
                                    onChange={e => setMindfulnessGoal(parseInt(e.target.value))}
                                    className="w-full accent-violet-500"
                                />
                            </div>
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                            Almost There
                        </button>
                    </div>
                );
            case 6: // Financials
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="text-center">
                            <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Monthly Budget</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Disposable income for spending.</p>
                         </div>
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800 space-y-4">
                            <div className="flex space-x-2">
                                <div className="w-1/3">
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Currency</label>
                                     <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-lg font-bold dark:text-white">
                                         <option value="£">£ GBP</option>
                                         <option value="$">$ USD</option>
                                         <option value="€">€ EUR</option>
                                         <option value="¥">¥ JPY</option>
                                     </select>
                                </div>
                                <div className="flex-1">
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Monthly Amount</label>
                                     <input 
                                        type="number" 
                                        value={budget} 
                                        onChange={e => setBudget(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-lg font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                     />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 text-center">Leave blank or 0 if you are unsure.</p>
                         </div>
                         <button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                            Choose Plan
                        </button>
                    </div>
                );
            case 7: // Membership Selection
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center">
                             <div className="bg-indigo-100 dark:bg-indigo-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold dark:text-white mb-2">Choose Your Path</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Invest in your daily improvement.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Lite Plan */}
                            <div 
                                onClick={() => setSelectedPlan('lite')}
                                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === 'lite' 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' 
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200'}`}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg dark:text-white">Kaizen Lite</h3>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">£1.99/mo</span>
                                </div>
                                <ul className="space-y-2 mb-2">
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Habit Tracking
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Basic Statistics
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Daily Journal
                                    </li>
                                </ul>
                                {selectedPlan === 'lite' && (
                                    <div className="absolute top-[-10px] right-4 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">
                                        SELECTED
                                    </div>
                                )}
                            </div>

                            {/* Premium Plan */}
                            <div 
                                onClick={() => setSelectedPlan('premium')}
                                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === 'premium' 
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500 shadow-lg shadow-purple-500/10' 
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-200'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white flex items-center">
                                            Kaizen Premium 
                                            <span className="ml-2 text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Best Value</span>
                                        </h3>
                                        <div className="flex items-center mt-1">
                                            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">7 Day Free Trial</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">£4.99/mo</span>
                                </div>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> <span className="font-bold">Everything in Lite</span>
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <Bot className="w-4 h-4 text-purple-500 mr-2" /> <span className="font-bold text-slate-800 dark:text-white">AI Lifestyle Coach</span>
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Unlimited History
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Cloud Sync & Backup
                                    </li>
                                </ul>
                                {selectedPlan === 'premium' && (
                                    <div className="absolute top-[-10px] right-4 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">
                                        SELECTED
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                            {selectedPlan === 'premium' ? 'Start 7-Day Free Trial' : 'Continue with Lite'}
                        </button>
                    </div>
                );
            case 8: // Payment Gateway
                return (
                     <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="text-center">
                            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h2 className="text-xl font-bold dark:text-white mb-1">Secure Checkout</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {selectedPlan === 'lite' ? '£1.99 due today' : '£0.00 due today'}
                            </p>
                            {selectedPlan === 'premium' && (
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                                    7-day free trial, then £4.99/mo
                                </p>
                            )}
                         </div>

                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800 space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-400 mb-1">Card Number</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="0000 0000 0000 0000" 
                                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-mono text-sm dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Expiry</label>
                                    <input 
                                        type="text" 
                                        placeholder="MM/YY" 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-mono text-sm dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">CVC</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="123" 
                                            className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-mono text-sm dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                <Lock className="w-3 h-3" />
                                <span>Payments are SSL encrypted and secure.</span>
                            </div>
                         </div>

                         <button 
                            onClick={processPayment} 
                            disabled={isProcessingPayment}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center disabled:opacity-70"
                         >
                            {isProcessingPayment ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...
                                </>
                            ) : (
                                selectedPlan === 'premium' ? 'Start Free Trial' : 'Pay & Subscribe'
                            )}
                        </button>
                     </div>
                );
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Progress Bar (Skipped on Welcome) */}
                {step > 0 && (
                    <div className="mb-8 flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-800'}`}></div>
                        ))}
                    </div>
                )}
                
                {renderStep()}
            </div>
        </div>
    );
};


interface TaskItemProps {
    item: KaizenItem;
    onToggle: (i: KaizenItem) => any;
    onDelete: (id: string) => any;
    onEdit: (i: KaizenItem) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ item, onToggle, onDelete, onEdit }) => {
    const [timeLeft, setTimeLeft] = useState(item.timeLimit ? item.timeLimit * 60 : 0);
    const [isActive, setIsActive] = useState(false);
    
    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        } else if (timeLeft === 0) setIsActive(false);
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const getPriorityColor = (p: PriorityLevel) => {
        if (p === 'high') return 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
        if (p === 'medium') return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
        return 'text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400';
    };

    return (
        <li className={`flex flex-col p-4 rounded-xl shadow-sm border transition-all duration-500 ease-in-out ${
            item.completed 
                ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30 grayscale-[0.5]' 
                : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:shadow-md'
        }`}>
            <div className="flex items-start justify-between w-full">
                <div className="flex items-center flex-grow mr-2 cursor-pointer" onClick={() => onToggle(item)}>
                     <div className={`mr-3 p-1 rounded-full border-2 transition-all duration-300 ${item.completed ? 'bg-emerald-500 border-emerald-500 scale-105 shadow-sm' : 'border-slate-300 dark:border-slate-600'}`}>
                         <Check className={`w-3 h-3 text-white transition-transform duration-300 ${item.completed ? 'scale-100 rotate-0' : 'scale-50 -rotate-90 opacity-0'}`} strokeWidth={4} />
                     </div>
                    <div>
                        <div className={`font-medium transition-colors ${item.completed ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.title}
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                            </span>
                            <span className="text-xs text-indigo-500 font-medium dark:text-indigo-400">+{item.points || POINTS_PER_TASK} pts</span>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-1">
                    <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" disabled={item.completed}>
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {item.timeLimit && !item.completed && (
                <div className="mt-3 flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 max-w-fit">
                    <div className={`text-sm font-medium w-16 text-center ${timeLeft < 60 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <div className="flex space-x-1 ml-2">
                        <button onClick={() => setIsActive(!isActive)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm">
                            {isActive ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                        </button>
                        <button onClick={() => { setIsActive(false); setTimeLeft(item.timeLimit! * 60); }} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm">
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
};

// --- Main App ---

const App = () => {
    // Services
    const [db, setDb] = useState<Firestore | null>(null);
    const [storage, setStorage] = useState<FirebaseStorage | null>(null);
    const [auth, setAuth] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Global UI State
    const [currentTab, setCurrentTab] = useState('tasks');
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' || 
                   (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [showFullCalendar, setShowFullCalendar] = useState(false);
    
    // Admin & Config State
    const [appConfig, setAppConfig] = useState<AppConfig>({ maintenanceMode: false, enableAiCoach: true });
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [adminAnnouncementText, setAdminAnnouncementText] = useState('');
    
    // Onboarding State
    const [hasOnboarded, setHasOnboarded] = useState(false);

    // Data State
    const [items, setItems] = useState<KaizenItem[]>([]);
    const [points, setPoints] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [history, setHistory] = useState<Record<string, HistoryEntry>>({});
    const [winDefinitions, setWinDefinitions] = useState<WinDefinition[]>(DEFAULT_WINS);
    
    // User Profile Data
    const [displayName, setDisplayName] = useState('Kaizen User');
    const [mainFocus, setMainFocus] = useState<WinCategory | null>(null);
    const [secondaryFocus, setSecondaryFocus] = useState<WinCategory | null>(null);

    // Task Form State
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemPoints, setNewItemPoints] = useState(POINTS_PER_TASK);
    const [newItemTime, setNewItemTime] = useState('');
    const [newItemPriority, setNewItemPriority] = useState<PriorityLevel>('low');
    const [editingTask, setEditingTask] = useState<KaizenItem | null>(null);

    // Finance State
    const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
    const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
    const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
    const [defaultDailyBudget, setDefaultDailyBudget] = useState(50);
    const [currency, setCurrency] = useState('£');
    
    // Finance Form State
    const [activeFinanceForm, setActiveFinanceForm] = useState<'income' | 'bill' | 'goal' | null>(null);
    const [financeFormName, setFinanceFormName] = useState('');
    const [financeFormAmount, setFinanceFormAmount] = useState('');
    const [financeFormDay, setFinanceFormDay] = useState('');

    // Calendar/Journal State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState(getDateString());
    const [journalText, setJournalText] = useState('');
    const [journalMood, setJournalMood] = useState<number | undefined>(undefined);
    const [gratitudeList, setGratitudeList] = useState<string[]>(['', '', '']);
    
    // Wins State
    const [isEditingWins, setIsEditingWins] = useState(false);
    
    // Chat State
    const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatThinking, setIsChatThinking] = useState(false);

    // --- Helpers for Demo Persistence ---
    const saveToLocal = (key: string, data: any) => {
        localStorage.setItem(`kaizen_demo_${key}`, JSON.stringify(data));
    };

    // --- Initialization ---
    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    useEffect(() => {
        const initFirebase = async () => {
            // Validate config before init
            if (firebaseConfig && firebaseConfig.projectId) {
                try {
                    const app = initializeApp(firebaseConfig);
                    setDb(getFirestore(app));
                    setAuth(getAuth(app));
                    setStorage(getStorage(app));

                    const unsubscribe = onAuthStateChanged(getAuth(app), (user) => {
                        if (user) setUserId(user.uid);
                        else signInAnonymously(getAuth(app)).catch(console.error);
                    });
                    return () => unsubscribe();
                } catch (e) {
                    console.error("Firebase init failed, falling back to demo mode:", e);
                    setupDemoMode();
                }
            } else {
                console.warn("No valid Firebase config found. Starting in Demo Mode.");
                setupDemoMode();
            }
        };

        initFirebase();
    }, []);

    const setupDemoMode = () => {
        setIsDemoMode(true);
        setUserId('demo-user');
        
        // Load Local Data
        const localItems = JSON.parse(localStorage.getItem('kaizen_demo_items') || '[]');
        setItems(localItems.map((i: any) => ({
            ...i, createdAt: i.createdAt ? new Timestamp(i.createdAt.seconds, i.createdAt.nanoseconds) : Timestamp.now()
        })));
        
        const localMeta = JSON.parse(localStorage.getItem('kaizen_demo_metadata') || '{}');
        setPoints(localMeta.points || 0);
        setRewards(localMeta.rewards || []);
        if (localMeta.winDefinitions) setWinDefinitions(localMeta.winDefinitions);
        if (localMeta.financialGoals) setFinancialGoals(localMeta.financialGoals);
        if (localMeta.defaultDailyBudget !== undefined) setDefaultDailyBudget(localMeta.defaultDailyBudget);
        if (localMeta.currencySymbol) setCurrency(localMeta.currencySymbol);
        if (localMeta.incomeSources) setIncomeSources(localMeta.incomeSources);
        if (localMeta.recurringBills) setRecurringBills(localMeta.recurringBills);
        if (localMeta.displayName) setDisplayName(localMeta.displayName);
        if (localMeta.mainFocus) setMainFocus(localMeta.mainFocus);
        if (localMeta.secondaryFocus) setSecondaryFocus(localMeta.secondaryFocus);
        
        // Check onboarding status
        setHasOnboarded(!!localMeta.onboardingCompleted);

        const localHistory = JSON.parse(localStorage.getItem('kaizen_demo_history') || '{}');
        setHistory(localHistory);

        // Load App Config
        const localConfig = JSON.parse(localStorage.getItem('kaizen_demo_config') || 'null');
        if (localConfig) setAppConfig(localConfig);

        setIsLoading(false);
    };

    // --- Data Sync (Firebase) ---
    useEffect(() => {
        if (!db || !userId || isDemoMode) return;
        
        const unsubItems = onSnapshot(collection(db, getCollectionPath(userId, ITEMS_COLLECTION)), (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as KaizenItem))
                .sort((a, b) => (Number(a.completed) - Number(b.completed)) || (a.priority === 'high' ? -1 : 1)));
            setIsLoading(false);
        });

        const unsubMeta = onSnapshot(getMetadataDocRef(userId, db), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserMetadata;
                setPoints(data.points || 0);
                setRewards(data.rewards || []);
                if (data.winDefinitions) setWinDefinitions(data.winDefinitions);
                if (data.financialGoals) setFinancialGoals(data.financialGoals);
                if (data.defaultDailyBudget !== undefined) setDefaultDailyBudget(data.defaultDailyBudget);
                if (data.currencySymbol) setCurrency(data.currencySymbol);
                if (data.incomeSources) setIncomeSources(data.incomeSources);
                if (data.recurringBills) setRecurringBills(data.recurringBills);
                
                // Profile
                if (data.displayName) setDisplayName(data.displayName);
                if (data.mainFocus) setMainFocus(data.mainFocus);
                if (data.secondaryFocus) setSecondaryFocus(data.secondaryFocus);
                setHasOnboarded(!!data.onboardingCompleted);
            } else {
                // No metadata, assume not onboarded
                setHasOnboarded(false);
                setDoc(getMetadataDocRef(userId, db), { points: 0, rewards: [], winDefinitions: DEFAULT_WINS });
            }
        });

        const unsubHistory = onSnapshot(collection(db, getCollectionPath(userId, HISTORY_COLLECTION)), (snap) => {
            const h: Record<string, HistoryEntry> = {};
            snap.docs.forEach(d => h[d.id] = d.data() as HistoryEntry);
            setHistory(h);
        });
        
        // Listen for App Config changes (mocked via a document for now, would be a global doc in real app)
        const unsubConfig = onSnapshot(doc(db, `artifacts/${appId}/config/global`), (snap) => {
            if (snap.exists()) {
                setAppConfig(snap.data() as AppConfig);
            }
        });

        return () => { unsubItems(); unsubMeta(); unsubHistory(); unsubConfig(); };
    }, [db, userId, isDemoMode]);

    // --- Computed Logic ---
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pMap = { high: 0, medium: 1, low: 2 };
            return pMap[a.priority] - pMap[b.priority];
        });
    }, [items]);

    const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
    const totalBills = recurringBills.reduce((sum, b) => sum + b.amount, 0);
    const disposableIncome = totalIncome - totalBills;
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const safeDailySpend = disposableIncome > 0 ? Math.floor(disposableIncome / daysInMonth) : 0;

    // Monthly Rollover Logic
    const monthlyRolloverData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const dailyData = [];
        let accumulatedRollover = 0;

        for (let d = 1; d <= days; d++) {
            const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
            const entry = history[dateStr];
            
            const baseBudget = entry?.dailyBudget ?? defaultDailyBudget;
            const spend = entry?.dailySpend ?? 0;
            const available = baseBudget + accumulatedRollover;
            const balance = available - spend;
            
            accumulatedRollover = balance; 

            dailyData.push({ date: dateStr, day: d, available, spend, balance, rollover: accumulatedRollover });
        }
        return dailyData;
    }, [history, currentDate, defaultDailyBudget]);

    const todayRollover = useMemo(() => {
        return monthlyRolloverData.find(d => d.date === getDateString());
    }, [monthlyRolloverData]);

    useEffect(() => {
        const entry = history[selectedDateStr] || {};
        setJournalText(entry.journal || '');
        setJournalMood(entry.mood);
        setGratitudeList(entry.gratitude || ['', '', '']);
    }, [selectedDateStr, history]);

    // --- Actions ---

    // Generic Update Helpers
    const updateLocalMeta = (data: Partial<UserMetadata>) => {
        const oldMeta = JSON.parse(localStorage.getItem('kaizen_demo_metadata') || '{}');
        const newMeta = { ...oldMeta, ...data };
        localStorage.setItem('kaizen_demo_metadata', JSON.stringify(newMeta));

        // Update State
        if (data.points !== undefined) setPoints(data.points);
        if (data.rewards !== undefined) setRewards(data.rewards);
        if (data.winDefinitions !== undefined) setWinDefinitions(data.winDefinitions);
        if (data.financialGoals !== undefined) setFinancialGoals(data.financialGoals);
        if (data.defaultDailyBudget !== undefined) setDefaultDailyBudget(data.defaultDailyBudget);
        if (data.currencySymbol !== undefined) setCurrency(data.currencySymbol);
        if (data.incomeSources !== undefined) setIncomeSources(data.incomeSources);
        if (data.recurringBills !== undefined) setRecurringBills(data.recurringBills);
        if (data.displayName !== undefined) setDisplayName(data.displayName);
        if (data.mainFocus !== undefined) setMainFocus(data.mainFocus);
        if (data.secondaryFocus !== undefined) setSecondaryFocus(data.secondaryFocus);
        if (data.onboardingCompleted !== undefined) setHasOnboarded(data.onboardingCompleted);
    };

    // App Config Updates
    const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
        const updated = { ...appConfig, ...newConfig };
        setAppConfig(updated);
        
        if (isDemoMode) {
            saveToLocal('config', updated);
        } else if (db) {
            // Save to a global config document
            await setDoc(doc(db, `artifacts/${appId}/config/global`), updated);
        }
    };

    const handleOnboardingComplete = async (data: Partial<UserMetadata>) => {
        if (isDemoMode) {
            updateLocalMeta(data);
        } else if (userId && db) {
            await setDoc(getMetadataDocRef(userId, db), data, { merge: true });
        }
        if (data.displayName) setDisplayName(data.displayName);
        if (data.mainFocus) setMainFocus(data.mainFocus);
        if (data.secondaryFocus) setSecondaryFocus(data.secondaryFocus);
        if (data.defaultDailyBudget !== undefined) setDefaultDailyBudget(data.defaultDailyBudget);
        if (data.currencySymbol) setCurrency(data.currencySymbol);
        if (data.winDefinitions) setWinDefinitions(data.winDefinitions);
        setHasOnboarded(true);
    };

    const resetAccount = async () => {
        if (confirm("Are you sure? This will wipe all data.")) {
             localStorage.clear();
             window.location.reload();
        }
    };

    // Task Actions
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;

        const newTask: Omit<KaizenItem, 'id'> = {
            title: newItemTitle,
            completed: false,
            createdAt: Timestamp.now(),
            points: newItemPoints,
            priority: newItemPriority,
            timeLimit: newItemTime ? parseInt(newItemTime) : undefined
        };

        if (editingTask) {
            if (isDemoMode) {
                const updated = items.map(i => i.id === editingTask.id ? { ...i, ...newTask } : i);
                setItems(updated);
                saveToLocal('items', updated);
            } else if (userId && db) {
                await updateDoc(doc(db, getCollectionPath(userId, ITEMS_COLLECTION), editingTask.id), newTask);
            }
            setEditingTask(null);
        } else {
            if (isDemoMode) {
                const item = { ...newTask, id: Date.now().toString() };
                const updated = [...items, item];
                setItems(updated);
                saveToLocal('items', updated);
            } else if (userId && db) {
                await addDoc(collection(db, getCollectionPath(userId, ITEMS_COLLECTION)), newTask);
            }
        }
        setNewItemTitle('');
        setNewItemTime('');
    };

    const handleToggleTask = async (item: KaizenItem) => {
        const newStatus = !item.completed;
        if (isDemoMode) {
            const updated = items.map(i => i.id === item.id ? { ...i, completed: newStatus } : i);
            setItems(updated);
            saveToLocal('items', updated);
            updateLocalMeta({ points: points + (newStatus ? (item.points || POINTS_PER_TASK) : -(item.points || POINTS_PER_TASK)) });
        } else if (userId && db) {
            await updateDoc(doc(db, getCollectionPath(userId, ITEMS_COLLECTION), item.id), { completed: newStatus });
            await updateDoc(getMetadataDocRef(userId, db), { 
                points: points + (newStatus ? (item.points || POINTS_PER_TASK) : -(item.points || POINTS_PER_TASK))
            });
        }
    };

    const handleDeleteTask = async (id: string) => {
         if (isDemoMode) {
            const updated = items.filter(i => i.id !== id);
            setItems(updated);
            saveToLocal('items', updated);
        } else if (userId && db) {
            await deleteDoc(doc(db, getCollectionPath(userId, ITEMS_COLLECTION), id));
        }
    };

    // Win Actions
    const handleToggleWin = async (winId: number) => {
        const dateStr = getDateString();
        const currentWins = history[dateStr]?.winsCompleted || [];
        const isCompleted = currentWins.includes(winId);
        
        let newWins;
        let pointsChange = 0;

        if (isCompleted) {
            newWins = currentWins.filter(id => id !== winId);
            pointsChange = -POINTS_PER_WIN;
        } else {
            newWins = [...currentWins, winId];
            pointsChange = POINTS_PER_WIN;
            if (newWins.length === 10) pointsChange += BONUS_PERFECT_DAY;
        }

        // Optimistic Update
        const newHistory = { ...history, [dateStr]: { ...history[dateStr], winsCompleted: newWins, active: true } };
        setHistory(newHistory);
        setPoints(p => p + pointsChange);

        if (isDemoMode) {
            saveToLocal('history', newHistory);
            updateLocalMeta({ points: points + pointsChange });
        } else if (userId && db) {
             const histRef = doc(db, getCollectionPath(userId, HISTORY_COLLECTION), dateStr);
             await setDoc(histRef, { winsCompleted: newWins, active: true }, { merge: true });
             await updateDoc(getMetadataDocRef(userId, db), { points: points + pointsChange });
        }
    };

     const handleUpdateWin = async (index: number, newTitle: string, category: WinCategory) => {
        const newDefs = [...winDefinitions];
        newDefs[index] = { ...newDefs[index], title: newTitle, category };
        setWinDefinitions(newDefs);

        if (isDemoMode) {
            updateLocalMeta({ winDefinitions: newDefs });
        } else if (userId && db) {
            await updateDoc(getMetadataDocRef(userId, db), { winDefinitions: newDefs });
        }
    };

    // Finance Actions
    const handleAddFinancialItem = async () => {
        if (!activeFinanceForm || !financeFormName || !financeFormAmount) return;
        const amount = parseFloat(financeFormAmount);

        if (activeFinanceForm === 'income') {
             const newSrc: IncomeSource = { id: Date.now().toString(), name: financeFormName, amount, dayOfMonth: parseInt(financeFormDay) || 1 };
             const newSources = [...incomeSources, newSrc];
             setIncomeSources(newSources);
             if (isDemoMode) updateLocalMeta({ incomeSources: newSources });
             else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { incomeSources: newSources });
        } else if (activeFinanceForm === 'bill') {
             const newBill: RecurringBill = { id: Date.now().toString(), name: financeFormName, amount, dayOfMonth: parseInt(financeFormDay) || 1 };
             const newBills = [...recurringBills, newBill];
             setRecurringBills(newBills);
             if (isDemoMode) updateLocalMeta({ recurringBills: newBills });
             else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { recurringBills: newBills });
        } else if (activeFinanceForm === 'goal') {
             const newGoal: FinancialGoal = { id: Date.now().toString(), title: financeFormName, targetAmount: amount, currentAmount: 0, createdAt: Timestamp.now() };
             const newGoals = [...financialGoals, newGoal];
             setFinancialGoals(newGoals);
             if (isDemoMode) updateLocalMeta({ financialGoals: newGoals });
             else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { financialGoals: newGoals });
        }

        setActiveFinanceForm(null);
        setFinanceFormName('');
        setFinanceFormAmount('');
        setFinanceFormDay('');
    };

    const handleDeleteFinancialItem = async (type: 'income' | 'bill' | 'goal', id: string) => {
         if (type === 'income') {
            const updated = incomeSources.filter(i => i.id !== id);
            setIncomeSources(updated);
            if (isDemoMode) updateLocalMeta({ incomeSources: updated });
            else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { incomeSources: updated });
         } else if (type === 'bill') {
            const updated = recurringBills.filter(i => i.id !== id);
            setRecurringBills(updated);
            if (isDemoMode) updateLocalMeta({ recurringBills: updated });
            else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { recurringBills: updated });
         } else {
            const updated = financialGoals.filter(i => i.id !== id);
            setFinancialGoals(updated);
            if (isDemoMode) updateLocalMeta({ financialGoals: updated });
            else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { financialGoals: updated });
         }
    };

    // Journal Actions
    const handleSaveJournal = async () => {
        const entry = {
            journal: journalText,
            mood: journalMood,
            gratitude: gratitudeList,
            active: true
        };
        
        if (isDemoMode) {
            const newHistory = { ...history, [selectedDateStr]: { ...history[selectedDateStr], ...entry } };
            setHistory(newHistory);
            saveToLocal('history', newHistory);
        } else if (userId && db) {
             await setDoc(doc(db, getCollectionPath(userId, HISTORY_COLLECTION), selectedDateStr), entry, { merge: true });
        }
    };

    // Coach Actions
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: 'user' as const, text: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: `You are a Kaizen lifestyle coach. The user's name is ${displayName}. Their main focus is ${mainFocus}. They have ${points} points. Current tasks: ${items.map(i => i.title).join(', ')}. Encourage them to take small steps. Be concise and motivating.\n\nUser: ${chatInput}` }] }
                ]
            });
            
            const result = await model;
            const response = result.response.text;
            setChatMessages(prev => [...prev, { role: 'model', text: response || "Keep going!" }]);
        } catch (e) {
            console.error(e);
            setChatMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Keep going!" }]);
        } finally {
            setIsChatThinking(false);
        }
    };

    // Renderers
    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        const days = [];
        
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10" />);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
            const hasData = history[dateStr]?.active;
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === getDateString();
            
            days.push(
                <div 
                    key={d}
                    onClick={() => { setSelectedDateStr(dateStr); setShowFullCalendar(false); }}
                    className={`h-10 flex items-center justify-center rounded-full cursor-pointer text-sm font-medium transition-all
                        ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                        ${isToday && !isSelected ? 'border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : ''}
                        ${hasData && !isSelected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                    `}
                >
                    {d}
                </div>
            );
        }
        
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg mb-6 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft className="w-5 h-5" /></button>
                    <span className="font-bold">{currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
                    {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    const renderAdminPanel = () => {
        if (!showAdminPanel) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                        <div className="flex items-center space-x-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
                                <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">Admin Console</h2>
                                <p className="text-xs text-slate-500">System Management & Analytics</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-8">
                        {/* Real-time Stats */}
                        <section>
                            <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center">
                                <Activity className="w-4 h-4 mr-2" /> Live Analytics
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                                    <div className="text-2xl font-black text-slate-800 dark:text-white">1,248</div>
                                    <div className="text-xs font-medium text-slate-500">Active Users</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">8.4k</div>
                                    <div className="text-xs font-medium text-slate-500">Tasks Today</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">99.9%</div>
                                    <div className="text-xs font-medium text-slate-500">Uptime</div>
                                </div>
                            </div>
                        </section>

                        {/* Feature Flags */}
                        <section>
                            <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center">
                                <Construction className="w-4 h-4 mr-2" /> System Configuration
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
                                    <div className="flex items-center">
                                        <Bot className="w-8 h-8 text-purple-500 mr-4" />
                                        <div>
                                            <div className="font-bold dark:text-white">AI Coach</div>
                                            <div className="text-xs text-slate-500">Enable Gemini AI assistant tab for all users</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={appConfig.enableAiCoach} 
                                            onChange={e => handleUpdateConfig({ enableAiCoach: e.target.checked })}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                                    <div className="flex items-center">
                                        <AlertTriangle className="w-8 h-8 text-red-500 mr-4" />
                                        <div>
                                            <div className="font-bold text-red-900 dark:text-red-400">Maintenance Mode</div>
                                            <div className="text-xs text-red-700 dark:text-red-300">Lock app access for non-admins</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={appConfig.maintenanceMode} 
                                            onChange={e => handleUpdateConfig({ maintenanceMode: e.target.checked })}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Global Announcements */}
                        <section>
                            <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center">
                                <Megaphone className="w-4 h-4 mr-2" /> Global Communication
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                                <label className="block text-xs font-bold text-slate-500 mb-2">Banner Message</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        value={adminAnnouncementText}
                                        onChange={e => setAdminAnnouncementText(e.target.value)}
                                        placeholder="e.g. Scheduled downtime at 2 AM UTC" 
                                        className="flex-1 p-2 bg-white dark:bg-slate-900 border dark:border-slate-600 rounded-lg text-sm dark:text-white"
                                    />
                                    <button 
                                        onClick={() => {
                                            handleUpdateConfig({ globalAnnouncement: adminAnnouncementText });
                                            setAdminAnnouncementText('');
                                            alert("Announcement Pushed!");
                                        }}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
                                    >
                                        Push
                                    </button>
                                </div>
                                {appConfig.globalAnnouncement && (
                                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm flex items-center justify-between">
                                        <span>Current: <strong>{appConfig.globalAnnouncement}</strong></span>
                                        <button onClick={() => handleUpdateConfig({ globalAnnouncement: '' })} className="text-xs underline">Clear</button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        // Maintenance Mode Lock Screen
        if (appConfig.maintenanceMode && displayName !== 'Admin') {
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-6 rounded-full animate-pulse">
                        <Construction className="w-16 h-16 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">Under Maintenance</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">
                        We're currently upgrading the Kaizen Life experience. Please check back shortly. Your streak is safe.
                    </p>
                </div>
            );
        }

        switch(currentTab) {
            case 'tasks':
                return (
                    <div className="space-y-6 pb-24">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border dark:border-slate-800">
                             <form onSubmit={handleAddTask} className="space-y-3">
                                <input 
                                    type="text" 
                                    value={newItemTitle} 
                                    onChange={e => setNewItemTitle(e.target.value)}
                                    placeholder="What needs doing?" 
                                    className="w-full text-lg bg-transparent border-b border-slate-200 dark:border-slate-700 p-2 focus:outline-none focus:border-indigo-500 dark:text-white"
                                />
                                <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                                    <select value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as PriorityLevel)} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm dark:text-slate-300">
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={newItemTime} 
                                        onChange={e => setNewItemTime(e.target.value)}
                                        className="w-20 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm dark:text-slate-300"
                                    />
                                     <button type="submit" disabled={!newItemTitle} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                                        {editingTask ? 'Update' : 'Add'}
                                    </button>
                                </div>
                             </form>
                        </div>

                        <div className="space-y-2">
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Active Tasks</h3>
                             <ul className="space-y-3">
                                {sortedItems.filter(i => !i.completed).map(item => (
                                    <TaskItem key={item.id} item={item} onToggle={handleToggleTask} onDelete={handleDeleteTask} onEdit={setEditingTask} />
                                ))}
                                {sortedItems.filter(i => !i.completed).length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>All caught up!</p>
                                    </div>
                                )}
                             </ul>
                        </div>

                         {sortedItems.some(i => i.completed) && (
                            <div className="space-y-2 pt-4">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Completed</h3>
                                 <ul className="space-y-3 opacity-60">
                                    {sortedItems.filter(i => i.completed).map(item => (
                                        <TaskItem key={item.id} item={item} onToggle={handleToggleTask} onDelete={handleDeleteTask} onEdit={setEditingTask} />
                                    ))}
                                 </ul>
                            </div>
                        )}
                    </div>
                );
            case 'wins':
                return (
                    <div className="space-y-6 pb-24">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold dark:text-white">Daily Wins</h2>
                            <button onClick={() => setIsEditingWins(!isEditingWins)} className="text-indigo-500 text-sm font-medium">
                                {isEditingWins ? 'Done' : 'Edit Habits'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {winDefinitions.map((win, idx) => {
                                const isCompleted = history[getDateString()]?.winsCompleted?.includes(win.id);
                                const styles = getWinStyles(win.category);
                                const Icon = isEditingWins ? Edit2 : (isCompleted ? Check : Plus);
                                const CatIcon = getCategoryIcon(win.category);

                                return (
                                    <div 
                                        key={win.id}
                                        onClick={() => !isEditingWins && handleToggleWin(win.id)}
                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group
                                            ${isCompleted 
                                                ? styles.activeBg
                                                : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                    >
                                        {isEditingWins ? (
                                            <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    value={win.title}
                                                    onChange={(e) => handleUpdateWin(idx, e.target.value, win.category)}
                                                    className="w-full bg-transparent border-b border-slate-300 text-sm font-bold focus:outline-none"
                                                />
                                                <select 
                                                    value={win.category} 
                                                    onChange={(e) => handleUpdateWin(idx, win.title, e.target.value as WinCategory)}
                                                    className="w-full text-xs bg-slate-100 dark:bg-slate-800 rounded p-1"
                                                >
                                                    <option value="mind">Mind</option>
                                                    <option value="body">Body</option>
                                                    <option value="nutrition">Nutrition</option>
                                                    <option value="growth">Growth</option>
                                                    <option value="wealth">Wealth</option>
                                                    <option value="fun">Fun</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-2 rounded-full ${isCompleted ? styles.iconBgActive : styles.iconBgInactive}`}>
                                                        {CatIcon}
                                                    </div>
                                                    <div className={`p-1 rounded-full ${isCompleted ? styles.checkColor : 'text-slate-300'}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                <h3 className={`font-bold leading-tight ${isCompleted ? styles.textActive : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {win.title}
                                                </h3>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'finance':
                return (
                    <div className="space-y-6 pb-24">
                        {/* Budget Summary Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Daily Available</p>
                                    <h2 className="text-4xl font-extrabold mt-1">{currency}{todayRollover?.available.toFixed(2)}</h2>
                                </div>
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                                    <Wallet className="w-6 h-6 text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>Spent Today</span>
                                    <span>{currency}{todayRollover?.spend.toFixed(2)}</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min(100, ((todayRollover?.spend || 0) / (todayRollover?.available || 1)) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 pt-2">
                                    <span>Safe Daily: {currency}{safeDailySpend}</span>
                                    <span>Rollover: {currency}{todayRollover?.rollover.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                         {/* Action Buttons */}
                         <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => setActiveFinanceForm('income')} className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border hover:bg-slate-50 dark:border-slate-800">
                                <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Income</span>
                            </button>
                             <button onClick={() => setActiveFinanceForm('bill')} className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border hover:bg-slate-50 dark:border-slate-800">
                                <TrendingDown className="w-6 h-6 text-red-500 mb-2" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bills</span>
                            </button>
                             <button onClick={() => setActiveFinanceForm('goal')} className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border hover:bg-slate-50 dark:border-slate-800">
                                <Target className="w-6 h-6 text-amber-500 mb-2" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Goals</span>
                            </button>
                         </div>

                         {/* Finance Forms Modal */}
                         {activeFinanceForm && (
                             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                                 <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                                     <div className="flex justify-between items-center mb-6">
                                         <h3 className="text-xl font-bold capitalize dark:text-white">Add {activeFinanceForm}</h3>
                                         <button onClick={() => setActiveFinanceForm(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
                                     </div>
                                     <div className="space-y-4">
                                         <input 
                                            placeholder="Name (e.g. Salary, Netflix)" 
                                            value={financeFormName} 
                                            onChange={e => setFinanceFormName(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-medium"
                                         />
                                         <input 
                                            type="number"
                                            placeholder="Amount" 
                                            value={financeFormAmount} 
                                            onChange={e => setFinanceFormAmount(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-medium"
                                         />
                                         {activeFinanceForm !== 'goal' && (
                                            <input 
                                                type="number"
                                                placeholder="Day of Month (1-31)" 
                                                value={financeFormDay} 
                                                onChange={e => setFinanceFormDay(e.target.value)}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-medium"
                                            />
                                         )}
                                         <button onClick={handleAddFinancialItem} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30">
                                             Add Item
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* Lists */}
                         <div className="space-y-4">
                             <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Savings Goals</h3>
                             {financialGoals.map(goal => (
                                 <div key={goal.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 flex justify-between items-center">
                                     <div>
                                         <div className="font-bold dark:text-white">{goal.title}</div>
                                         <div className="text-xs text-slate-500">{currency}{goal.currentAmount} / {currency}{goal.targetAmount}</div>
                                         <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                                             <div className="h-full bg-amber-500" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }} />
                                         </div>
                                     </div>
                                     <button onClick={() => handleDeleteFinancialItem('goal', goal.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                             ))}
                         </div>

                         <div className="space-y-4">
                             <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Recurring</h3>
                             {incomeSources.map(inc => (
                                 <div key={inc.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 dark:border-slate-800 flex justify-between items-center">
                                     <div>
                                         <div className="font-bold dark:text-white">{inc.name}</div>
                                         <div className="text-xs text-slate-500">Day {inc.dayOfMonth}</div>
                                     </div>
                                     <div className="flex items-center space-x-3">
                                         <span className="font-bold text-emerald-600">+{currency}{inc.amount}</span>
                                         <button onClick={() => handleDeleteFinancialItem('income', inc.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                     </div>
                                 </div>
                             ))}
                             {recurringBills.map(bill => (
                                 <div key={bill.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-l-4 border-l-red-500 dark:border-slate-800 flex justify-between items-center">
                                     <div>
                                         <div className="font-bold dark:text-white">{bill.name}</div>
                                         <div className="text-xs text-slate-500">Day {bill.dayOfMonth}</div>
                                     </div>
                                     <div className="flex items-center space-x-3">
                                         <span className="font-bold text-red-600">-{currency}{bill.amount}</span>
                                         <button onClick={() => handleDeleteFinancialItem('bill', bill.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                );
            case 'journey':
                return (
                    <div className="space-y-6 pb-24">
                        {/* Date Header / Calendar Toggle */}
                        <div 
                            onClick={() => setShowFullCalendar(!showFullCalendar)}
                            className="flex items-center justify-center space-x-2 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                {new Date(selectedDateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })}
                            </h2>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showFullCalendar ? 'rotate-180' : ''}`} />
                        </div>

                        {showFullCalendar && renderCalendarGrid()}

                        {/* Mood Tracker */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 text-center">How was your day?</h3>
                            <div className="flex justify-between px-2">
                                {MOODS.map((m) => (
                                    <button 
                                        key={m.val}
                                        onClick={() => { setJournalMood(m.val); handleSaveJournal(); }}
                                        className={`flex flex-col items-center space-y-2 transition-all duration-300 ${journalMood === m.val ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className={`p-3 rounded-2xl ${journalMood === m.val ? `${m.activeBg} ${m.activeBorder} border-2 ${m.darkActiveBg}` : 'bg-slate-50 dark:bg-slate-800'}`}>
                                            <m.Icon className={`w-6 h-6 ${m.color}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Journal Input */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border dark:border-slate-800">
                             <div className="flex items-center mb-4 space-x-2">
                                 <BookOpen className="w-5 h-5 text-indigo-500" />
                                 <h3 className="font-bold dark:text-white">Daily Reflection</h3>
                             </div>
                             <textarea 
                                value={journalText}
                                onChange={e => setJournalText(e.target.value)}
                                onBlur={handleSaveJournal}
                                placeholder="What's on your mind today?"
                                className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white"
                             />
                        </div>

                        {/* Gratitude */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border dark:border-slate-800">
                            <div className="flex items-center mb-4 space-x-2">
                                 <Heart className="w-5 h-5 text-rose-500" />
                                 <h3 className="font-bold dark:text-white">Gratitude</h3>
                             </div>
                             <div className="space-y-3">
                                 {[0, 1, 2].map(i => (
                                     <input 
                                        key={i}
                                        value={gratitudeList[i]}
                                        onChange={e => {
                                            const newL = [...gratitudeList];
                                            newL[i] = e.target.value;
                                            setGratitudeList(newL);
                                        }}
                                        onBlur={handleSaveJournal}
                                        placeholder={`I am grateful for...`}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm dark:text-white"
                                     />
                                 ))}
                             </div>
                        </div>
                    </div>
                );
            case 'rewards':
                return (
                    <div className="space-y-6 pb-24">
                        <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="opacity-80 text-sm font-medium mb-1">Available Balance</p>
                                <h2 className="text-5xl font-extrabold">{points} <span className="text-2xl font-bold opacity-60">pts</span></h2>
                            </div>
                            <Gift className="absolute right-[-20px] bottom-[-20px] w-32 h-32 opacity-20 rotate-12" />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {rewards.map(reward => (
                                <div key={reward.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold dark:text-white">{reward.name}</h3>
                                        <p className="text-indigo-500 font-bold text-sm">{reward.cost} pts</p>
                                    </div>
                                    <button 
                                        disabled={points < reward.cost}
                                        onClick={async () => {
                                            if(confirm(`Redeem ${reward.name}?`)) {
                                                // Redemption logic would go here
                                                const newPoints = points - reward.cost;
                                                setPoints(newPoints);
                                                if (isDemoMode) updateLocalMeta({ points: newPoints });
                                                else if (userId && db) await updateDoc(getMetadataDocRef(userId, db), { points: newPoints });
                                                alert("Reward Redeemed! Enjoy!");
                                            }
                                        }}
                                        className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold disabled:opacity-20"
                                    >
                                        Redeem
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    const name = prompt("Reward Name:");
                                    const cost = parseInt(prompt("Cost (points):") || "0");
                                    if (name && cost) {
                                        const newReward = { id: Date.now().toString(), name, cost, redeemed: false };
                                        const updated = [...rewards, newReward];
                                        setRewards(updated);
                                        if (isDemoMode) updateLocalMeta({ rewards: updated });
                                        else if (userId && db) updateDoc(getMetadataDocRef(userId, db), { rewards: updated });
                                    }
                                }}
                                className="p-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Add Custom Reward
                            </button>
                        </div>
                    </div>
                );
            case 'coach':
                if (!appConfig.enableAiCoach) return null;
                return (
                    <div className="flex flex-col h-[calc(100vh-180px)]">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4">
                            {chatMessages.length === 0 && (
                                <div className="text-center text-slate-400 mt-10">
                                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>I'm your Kaizen AI Coach.<br/>Ask me for advice on your habits or goals.</p>
                                </div>
                            )}
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                            <div className="flex space-x-2">
                                <input 
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask your coach..."
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                                <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatThinking} className="p-3 bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'account':
                return (
                    <div className="space-y-8 pb-24">
                        {/* Profile Header */}
                        <div className="flex items-center space-x-4 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {displayName.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">{displayName}</h2>
                                <p className="text-sm text-slate-500 capitalize">Focus: {mainFocus} {secondaryFocus ? `& ${secondaryFocus}` : ''}</p>
                            </div>
                        </div>

                        {/* Admin Access */}
                        {displayName === 'Admin' && (
                            <button 
                                onClick={() => setShowAdminPanel(true)}
                                className="w-full p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center justify-between group transition-all hover:scale-[1.02]"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="bg-indigo-500 p-2 rounded-lg">
                                        <Settings className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold">Admin Console</div>
                                        <div className="text-xs text-slate-400">Manage Users & System</div>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                            </button>
                        )}

                        {/* Settings Form */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-400 uppercase text-xs ml-2">Settings</h3>
                            
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border dark:border-slate-800 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Display Name</label>
                                    <input 
                                        value={displayName} 
                                        onChange={e => {
                                            setDisplayName(e.target.value);
                                            if(isDemoMode) updateLocalMeta({displayName: e.target.value});
                                            else if(userId && db) updateDoc(getMetadataDocRef(userId, db), {displayName: e.target.value});
                                        }}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Daily Budget</label>
                                    <div className="flex space-x-2">
                                        <select 
                                            value={currency}
                                            onChange={e => {
                                                setCurrency(e.target.value);
                                                if(isDemoMode) updateLocalMeta({currencySymbol: e.target.value});
                                                else if(userId && db) updateDoc(getMetadataDocRef(userId, db), {currencySymbol: e.target.value});
                                            }}
                                            className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white"
                                        >
                                            <option value="£">£</option>
                                            <option value="$">$</option>
                                            <option value="€">€</option>
                                        </select>
                                        <input 
                                            type="number"
                                            value={defaultDailyBudget}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                setDefaultDailyBudget(val);
                                                if(isDemoMode) updateLocalMeta({defaultDailyBudget: val});
                                                else if(userId && db) updateDoc(getMetadataDocRef(userId, db), {defaultDailyBudget: val});
                                            }}
                                            className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Main Focus</label>
                                    <div className="grid grid-cols-6 gap-1">
                                        {['mind', 'body', 'nutrition', 'growth', 'wealth', 'fun'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => {
                                                    setMainFocus(f as WinCategory);
                                                    if(isDemoMode) updateLocalMeta({mainFocus: f as WinCategory});
                                                    else if(userId && db) updateDoc(getMetadataDocRef(userId, db), {mainFocus: f as WinCategory});
                                                }}
                                                className={`p-2 rounded-lg text-xs font-bold capitalize transition-colors truncate ${mainFocus === f ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Secondary Focus</label>
                                    <div className="grid grid-cols-6 gap-1">
                                        {['mind', 'body', 'nutrition', 'growth', 'wealth', 'fun'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => {
                                                    setSecondaryFocus(f as WinCategory);
                                                    if(isDemoMode) updateLocalMeta({secondaryFocus: f as WinCategory});
                                                    else if(userId && db) updateDoc(getMetadataDocRef(userId, db), {secondaryFocus: f as WinCategory});
                                                }}
                                                className={`p-2 rounded-lg text-xs font-bold capitalize transition-colors truncate ${secondaryFocus === f ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-red-400 uppercase text-xs ml-2">Danger Zone</h3>
                            <button 
                                onClick={resetAccount}
                                className="w-full flex items-center justify-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Reset Account Data</span>
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    // --- Main Render ---

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-400 font-medium">Loading your life...</p>
            </div>
        );
    }

    if (!hasOnboarded) {
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
    }

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors duration-300`}>
            {/* Admin Modal */}
            {renderAdminPanel()}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30 border-b dark:border-slate-800">
                {appConfig.globalAnnouncement && (
                    <div className="bg-indigo-600 text-white text-xs font-bold text-center py-2 px-4 animate-in slide-in-from-top">
                        <Megaphone className="w-3 h-3 inline mr-2" />
                        {appConfig.globalAnnouncement}
                    </div>
                )}
                <div className="px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Kaizen:</span>
                            <span className="ml-1 text-slate-800 dark:text-white">LifeTrack</span>
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">Welcome back, {displayName.split(' ')[0]}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
                            <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-1.5" />
                            <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">{points}</span>
                        </div>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`pt-24 px-4 max-w-lg mx-auto min-h-screen ${appConfig.globalAnnouncement ? 'pt-32' : ''}`}>
                {renderContent()}
            </main>

            {/* Navigation */}
            {(!appConfig.maintenanceMode || displayName === 'Admin') && (
                <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t dark:border-slate-800 px-6 py-3 z-40 flex justify-between items-center safe-area-pb">
                    <button onClick={() => setCurrentTab('tasks')} className={`flex flex-col items-center space-y-1 ${currentTab === 'tasks' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <CheckCircle className="w-6 h-6" strokeWidth={currentTab === 'tasks' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Tasks</span>
                    </button>
                    <button onClick={() => setCurrentTab('wins')} className={`flex flex-col items-center space-y-1 ${currentTab === 'wins' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <Award className="w-6 h-6" strokeWidth={currentTab === 'wins' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Wins</span>
                    </button>
                    <button onClick={() => setCurrentTab('finance')} className={`flex flex-col items-center space-y-1 ${currentTab === 'finance' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <Coins className="w-6 h-6" strokeWidth={currentTab === 'finance' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Money</span>
                    </button>
                    <button onClick={() => setCurrentTab('journey')} className={`flex flex-col items-center space-y-1 ${currentTab === 'journey' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <BookOpen className="w-6 h-6" strokeWidth={currentTab === 'journey' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Journey</span>
                    </button>
                    <button onClick={() => setCurrentTab('rewards')} className={`flex flex-col items-center space-y-1 ${currentTab === 'rewards' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <Gift className="w-6 h-6" strokeWidth={currentTab === 'rewards' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Rewards</span>
                    </button>
                     <button onClick={() => setCurrentTab('account')} className={`flex flex-col items-center space-y-1 ${currentTab === 'account' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        <User className="w-6 h-6" strokeWidth={currentTab === 'account' ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">Profile</span>
                    </button>
                </nav>
            )}
        </div>
    );
};

export default App;