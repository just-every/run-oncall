import {useEffect, useState} from 'react';
import type {ServicePageProps} from './ServicePage';
import {ServicePage} from './ServicePage';
import {ServiceList} from './ServiceList';

type Props = Omit<ServicePageProps, 'service'> & {selected: string; open: (path: string) => void};
export function ServicesHome({selected, open, ...props}: Props) {
  const [created, setCreated] = useState('');
  useEffect(() => {if (selected) return;let at=0;try {at=Number(sessionStorage.getItem('oncall:services:scroll')) || 0;} catch {}const frame=requestAnimationFrame(() => scrollTo({top:at}));return () => cancelAnimationFrame(frame);}, [selected]);
  const service = props.state.services.find(value => value.id === selected);
  return <div className={'services-workspace' + (selected ? ' with-service' : '')}>
    <ServiceList state={props.state} admin={props.admin} busy={props.busy} selected={selected} command={props.command} open={path => {setCreated(decodeURIComponent(path.split('/').at(-1)!));open(path);}}/>
    {service && <ServicePage key={service.id} service={service} {...props} focusName={created === selected}/>}
    {selected && !service && <section className="service-page panel padded"><h2>Service not found</h2><a href="/settings/services">Back to Services</a></section>}
  </div>;
}
