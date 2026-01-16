---
title: 'flex'
tags: ['css']
created date: '2025-09-11'
edited date: '2025-09-15'
---

> Flexbox(CSS Flexible Box Layout Module) 에서 아이템 단위에 적용되는 단축 속성

<br/>

Flexbox는 레이아웃 전체 시스템을 의미하며, 컨테이너와 그 안의 아이템들이 공간을 배치·정렬·분배하는 방식에 대한 큰 틀의 규칙과 개념이다.

- 컨테이너 속성
  - display: flex
  - flex-direction
  - justify-content
  - aling-items
  - flex-wrap 등
- 아이템 속성
  - _flex-grow_
  - _flex-shrink_
  - _flex-basis_
  - align-self
  - order 등

<br/>

여기서 아이템용 속성 중 flex는 **아이템의 크기를 어떻게 분배하고, 공간이 부족하거나 남을 때 어떻게 행동할지 결정하는 것**으로, 단축 속성으로도 작성할 수 있다.

```css
flex: <flex-grow> <flex-shrink> <flex-basis>;
```

<br/>

1. **flex-grow**
   - 컨테이너 안에 남는 공간이 있으면, 각 아이템의 flex-grow 값에 따라 분배된다.
   - 기본값: 0 (남는 공간을 차지하지 않음)
     - 1: 동일한 비율로 남는 공간 분배
     - n: 값이 1인 요소보다 n 배 더 많이 차지

   ```css
   .item1 {
     flex-grow: 1;
   }
   .item2 {
     flex-grow: 2;
   }
   ```

   컨테이너 여유 공간이 300px 라면, item1은 100px, item2는 200px 를 추가로 갖는다.

<br/>

2. **flex-shrink**

- 컨테이너가 좁아지면 각 아이템이 flex-shrink 값 비율만큼 줄어든다.
- 기본값: 1 (줄어든다)
  - 0: 줄어들지 않는다.
  - n: 1인 다른 요소보다 n배 더 빨리 줄어든다.

  ```css
  .item1 {
    flex-shrink: 1;
  }
  .item2 {
    flex-shrink: 0;
  }
  ```

  컨테이너 공간이 부족해지면 item1은 줄어들고, item2는 줄어들지 않는다.

<br/>

3. **flex-basis**

- grow/shrink 연산이 적용되기 전에 아이템의 기준 크기를 설정한다.
- 기본값: auto (아이템에 정의된 width, height를 따른다)
  - n px, %: 이 지정 크기에서 출발한다. 이후 grow, shrink 규칙이 적용된다.

```css
.item {
  flex-basis: 150px;
  flex-grow: 1;
}
```

기본 크기는 150px, 컨테이너에 여유 공간이 있으면 추가로 확장된다.
