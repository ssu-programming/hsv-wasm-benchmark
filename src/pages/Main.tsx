import styles from "./Main.module.scss";

const Main = () => {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>실시간 이미지 HSV 비교</h1>
      <span className={styles.team}>김나윤(팀장), 장우진, 강명준</span>
      <p className={styles.description}>
        이 웹 애플리케이션은 이미지의 HSV(Hue, Saturation, Value) 값을
        실시간으로 조정하며, 브라우저에서의 성능 차이를 직접 체감할 수 있도록
        설계되었습니다. 사용자는 이미지를 업로드하거나 제공된 샘플 이미지를
        선택한 후, 슬라이더를 통해 색상(Hue), 채도(Saturation), 밝기(Value)를
        자유롭게 조절할 수 있습니다.
        <br />
        <br />
        특히, 이 프로젝트는 두 가지 처리 방식을 동시에 제공합니다. 하나는{" "}
        <strong>JavaScript</strong>를 이용한 처리 방식으로, 브라우저만으로 모든
        계산을 수행하며, 다른 하나는
        <strong> C++ 코드 기반 WebAssembly(WASM)</strong> 방식으로, 동일한
        이미지와 조정 값을 적용하면서 처리 속도와 반응성을 비교할 수 있습니다.
        <br />
        <br />이 실험을 통해 WASM이 제공하는 <strong>성능 향상</strong>과
        JavaScript 처리의 한계를 직관적으로 확인할 수 있으며, 실시간 이미지
        처리, WebAssembly 활용, 브라우저 최적화에 대한 이해를 높일 수
        있었습니다.
      </p>
    </div>
  );
};

export default Main;
