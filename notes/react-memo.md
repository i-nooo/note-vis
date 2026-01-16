---
title: 'React.memo'
tags: ['react', '불변성']
created date: '2025-09-10'
edited data: '2025-09-10'
---

React.memo는 React에서 함수형 컴포넌트의 불필요한 리렌더링을 방지하기 위한 고차 컴포넌트(HOC)이다.

React.memo는 얕은 비교(shallow comparison) 를 통해 이전 props와 새 props가 동일하면 리렌더링을 건너뛴다.

즉, 동일한 props가 들어오면 컴포넌트를 **다시 렌더링하지 않고 이전에 렌더링된 결과를 재사용**한다.

다만,

- 얕은 비교 한계: React.memo는 props 객체를 얕게 비교하기 때문에, 객체나 배열 같은 참조 타입이 매번 새로 만들어지면 매번 다르다고 판단한다. 이 경우 [[useMemo|useMemo]]나 [[useCallback]]으로 안정된 참조를 제공해야 한다.
- 모든 경우에 성능 향상 X: React.memo 자체도 비교 연산 비용이 있기 때문에, 단순한 컴포넌트에는 오히려 성능 이득이 없다. 렌더링 비용이 큰 컴포넌트에 적용하는 것이 적절하다.
