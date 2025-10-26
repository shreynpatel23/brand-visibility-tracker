const formatCredits = (value: number) => {
  return value.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
};

export default formatCredits;
