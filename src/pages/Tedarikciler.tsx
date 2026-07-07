import { tedarikciApi } from '../data/api'
import Rehber from '../components/Rehber'

export default function Tedarikciler() {
  return (
    <Rehber
      baslik="Tedarikçiler"
      aciklama="Sipariş listelerini göndereceğiniz tedarikçi rehberi."
      tekil="tedarikçi"
      api={tedarikciApi}
    />
  )
}
