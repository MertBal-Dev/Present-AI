import React from 'react';

export const Icon = ({ children, className = "w-6 h-6" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>);
export const Code = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></Icon>);
export const Sparkles = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></Icon>);
export const Wand2 = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 4l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></Icon>);
export const Download = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></Icon>);
export const Eye = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></Icon>);
export const Plus = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></Icon>);
export const ChevronRight = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></Icon>);
export const ChevronLeft = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></Icon>);
export const GripVertical = ({ className }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" /></svg>);
export const X = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></Icon>);
export const Github = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Icon>);
export const Zap = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></Icon>);
export const Target = ({ className }) => (<Icon className={className}><circle cx="12" cy="12" r="10" strokeWidth={2} /><circle cx="12" cy="12" r="6" strokeWidth={2} /><circle cx="12" cy="12" r="2" strokeWidth={2} /></Icon>);
export const Rocket = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></Icon>);
export const Menu = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></Icon>);
export const Trash2 = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></Icon>);
export const Sun = ({ className }) => (<Icon className={className}><circle cx="12" cy="12" r="5" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.364-7.364l-1.414 1.414M6.05 17.95l-1.414 1.414m0-13.728l1.414 1.414M17.95 17.95l1.414 1.414" /></Icon>);
export const Moon = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></Icon>);
export const Undo = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8A5 5 0 009 5H7" /></Icon>);
export const Redo = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 15l3-3m0 0l-3-3m3 3H5a5 5 0 005 5h2" /></Icon>);
export const RefreshCw = ({ className }) => (<Icon className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></Icon>);
export const Lightbulb = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3a1 1 0 012 0v1a1 1 0 11-2 0V3zM21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 17a3.75 3.75 0 007.5 0h-7.5z" /></Icon>);
export const UploadCloud = ({ className }) => (<Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></Icon>);
export const Robot = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {/* Anten */}
        <circle cx="12" cy="2" r="1" fill="currentColor" />
        <line x1="12" y1="3" x2="12" y2="5" />

        {/* Kafa */}
        <rect x="6" y="5" width="12" height="9" rx="2" />

        {/* Gözler */}
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        <circle cx="15" cy="9" r="1.5" fill="currentColor" />

        {/* Ağız/Ekran */}
        <line x1="9" y1="12" x2="15" y2="12" />

        {/* Boyun */}
        <line x1="12" y1="14" x2="12" y2="16" />

        {/* Gövde */}
        <rect x="7" y="16" width="10" height="5" rx="1" />

        {/* Kollar */}
        <line x1="7" y1="17" x2="4" y2="19" />
        <line x1="17" y1="17" x2="20" y2="19" />
        <circle cx="4" cy="19" r="1" fill="currentColor" />
        <circle cx="20" cy="19" r="1" fill="currentColor" />

        {/* Bacaklar */}
        <line x1="9" y1="21" x2="9" y2="23" />
        <line x1="15" y1="21" x2="15" y2="23" />
    </svg>
);