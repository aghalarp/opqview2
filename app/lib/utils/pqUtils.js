import pInPoly from 'point-in-polygon';

Global.Utils.PqUtils = Object.freeze({
  PROHIBITED_POLYGON: [[0, 500], [1, 200], [3, 140], [3, 120], [500, 120], [500, 110], [Number.MAX_SAFE_INTEGER, 110], [Number.MAX_SAFE_INTEGER, 500]],
  NO_DAMAGE_POLYGON: [[20, 0], [20, 70], [500, 70], [500, 80], [10000, 80], [10000, 90], [100000, 90], [Number.MAX_SAFE_INTEGER, 90], [Number.MAX_SAFE_INTEGER, 0]],

  getIticRegion(duration, voltage) {
    const pnv = this.voltageToPercentNominal(voltage);

    if (pInPoly([duration, pnv], this.PROHIBITED_POLYGON)) {
      return Global.Enums.IticRegion.PROHIBITED;
    }
    else if (pInPoly([duration, pnv], this.NO_DAMAGE_POLYGON)) {
      return Global.Enums.IticRegion.NO_DAMAGE;
    }
    else {
      return Global.Enums.IticRegion.NO_INTERRUPTION;
    }
  },

  voltageToPercentNominal(voltage) {
    return Math.abs((voltage / 120.0) * 100);
  }
});
