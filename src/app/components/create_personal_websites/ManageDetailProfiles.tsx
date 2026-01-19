import React, { useState } from "react";

/** * TYPESCRIPT INTERFACES
*/
interface User { name: string; age: number; }
interface Todo { id: number; text: string; }

export default function StateMaster() {
// 1. LAZY/FUNCTIONAL INITIALIZATION (Runs once, SSR safe)
const [theme, setTheme] = useState<string>(() => {
return typeof window !== "undefined" ? localStorage.getItem("theme") || "light" : "light";
});

// 2. PRIMITIVE STATE (Boolean/Number/String)
const [count, setCount] = useState<number>(0);
const [isVisible, setIsVisible] = useState<boolean>(true);

// 3. OBJECT STATE (Requires Spread Operator for memory reference change)
const [user, setUser] = useState<User>({ name: "Alice", age: 30 });

// 4. ARRAY STATE (Requires spreading into a new array address)
const [todos, setTodos] = useState<Todo[]>([
{ id: 1, text: "Setup Node Server" }
]);

const handleAllChanges = () => {
// 5. FUNCTIONAL UPDATE (Safest for math/async)
setCount(prev => prev + 1);

// 6. OBJECT UPDATE (Immutable Spread)
setUser(prev => ({ ...prev, name: "Bob" }));

// 7. ARRAY UPDATE (Adding new unique object)
setTodos(prev => [...prev, { id: Date.now(), text: "Learn React 19" }]);

// 8. TOGGLE PATTERN
setIsVisible(v => !v);
};

return (
<div className={`p-5 ${theme}`}>
<button onClick={handleAllChanges} className="border p-2 bg-blue-500 text-white">
Execute All Scenarios
</button>

<div className="mt-4">
<p>Count: {count} | Visible: {String(isVisible)}</p>
<p>User: {user.name} ({user.age})</p>
<ul>{todos.map(t => <li key={t.id}>{t.text}</li>)}</ul>
</div>
</div>
);
}