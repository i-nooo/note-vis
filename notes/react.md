---
title: 'React'
tags: ['frontend', 'ui', 'library']
date: '2024-02-01'
---

# React

React is a JavaScript library for building user interfaces, maintained by Facebook and the community.

## Core Concepts

### Components
```jsx
function Welcome(props) {
    return <h1>Hello, {props.name}</h1>;
}
```

### JSX
- JavaScript XML syntax extension
- Allows writing HTML-like code in JavaScript
- Transpiled to `React.createElement()` calls

### State and Props
- **Props**: Read-only properties passed to components
- **State**: Mutable data that affects component rendering

### Hooks
```jsx
import { useState, useEffect } from 'react';

function Counter() {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        document.title = `Count: ${count}`;
    }, [count]);
    
    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

## Prerequisites

Understanding these topics helps with React development:
- [[javascript|JavaScript]] ES6+ features
- HTML and CSS fundamentals
- DOM manipulation concepts

## Ecosystem

- React Router - Navigation
- Redux/Zustand - State management  
- Next.js - Full-stack framework
- React Testing Library - Testing

#react #frontend #javascript