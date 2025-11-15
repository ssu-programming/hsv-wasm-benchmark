import styles from "./NotFound.module.scss";

function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.message}>페이지를 찾을 수 없습니다.</p>
    </div>
  );
}

export default NotFound;
